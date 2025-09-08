#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{process::{Command, Stdio, Child}, io::{BufRead, BufReader}, thread, time::Duration, net::TcpStream, path::PathBuf};
#[cfg(unix)]
use std::os::unix::process::CommandExt; // for pre_exec
#[cfg(unix)]
use libc::{killpg, SIGTERM, SIGKILL};
use tauri::{Manager, AppHandle};

// Windows Job Object wrapper to ensure child process tree is terminated when app exits.
#[cfg(windows)]
mod win_job {
  use windows_sys::Win32::System::Threading::{
    CreateJobObjectW, SetInformationJobObject, AssignProcessToJobObject,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
  };
  use windows_sys::Win32::Foundation::CloseHandle;
  use std::{mem::{zeroed, size_of}, os::windows::io::AsHandle, process::Child};

  pub struct JobHandle(isize);
  impl JobHandle {
    pub fn new_kill_on_close() -> Option<Self> {
      unsafe {
        let h = CreateJobObjectW(std::ptr::null_mut(), std::ptr::null());
        if h == 0 { return None; }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = SetInformationJobObject(
          h,
          JobObjectExtendedLimitInformation,
          &info as *const _ as *const _,
          size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32
        );
        if ok == 0 { CloseHandle(h); return None; }
        Some(JobHandle(h))
      }
    }
    pub fn assign(&self, child: &Child) {
      unsafe {
        let _ = AssignProcessToJobObject(self.0, child.as_handle().as_raw_handle() as isize);
      }
    }
  }
  impl Drop for JobHandle { fn drop(&mut self) { unsafe { let _ = CloseHandle(self.0); } } }
  pub use JobHandle as Handle;
}

fn server_root(app: &AppHandle) -> Option<PathBuf> {
  // Look for bundled Next standalone under resources
  if let Ok(res_dir) = app.path().resource_dir() {
    let p = res_dir.join("_up_").join(".next").join("standalone");
    println!("Checking for Next server at {}", p.display());
    if p.join("server.js").exists() { return Some(p); }
  }
  None
}

fn spawn_next(app: &AppHandle, port: u16) -> Option<Child> {
  let root = server_root(app)?;
  println!("Starting Next server from {}", root.display());
  let user_db = app.path().app_data_dir().ok().map(|p| p.join("db.sqlite"));
  // resources/.next/standalone -> resources
  let app_root_dir = root.parent().and_then(|p| p.parent()).unwrap_or(&root);
  let mut cmd = Command::new("node");
  cmd.arg("server.js")
    .current_dir(&root)
    .env("NODE_ENV", "production")
    .env("PORT", port.to_string())
    .env("HOSTNAME", "127.0.0.1")
    .env("APP_ROOT", app_root_dir.to_string_lossy().to_string())
    .env("SQLITE_VERBOSE", "1")
    .env(
      "SQLITE_DB_PATH",
      user_db
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "db.sqlite".into()),
    )
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());
  #[cfg(unix)]
  unsafe {
    cmd.pre_exec(|| {
      // Set a new process group so we can target the whole tree.
      libc::setpgid(0, 0);
      Ok(())
    });
  }
  let mut child = cmd.spawn().ok()?;
  let stdout = child.stdout.take();
  let stderr = child.stderr.take();

  if let Some(out) = stdout {
    thread::spawn(move || {
      let reader = BufReader::new(out);
      for line in reader.lines() {
        if let Ok(l) = line { println!("[next] {}", l); }
      }
    });
  }
  if let Some(err) = stderr {
    thread::spawn(move || {
      let reader = BufReader::new(err);
      for line in reader.lines() {
        if let Ok(l) = line { eprintln!("[next] {}", l); }
      }
    });
  }
  Some(child)
}

fn wait_for_port(port: u16, timeout_ms: u64) -> bool {
  let start = std::time::Instant::now();
  loop {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() { return true; }
    if start.elapsed() > Duration::from_millis(timeout_ms) { return false; }
    thread::sleep(Duration::from_millis(200));
  }
}

struct NextProc {
  child: Option<Child>,
  #[cfg(windows)]
  job: Option<win_job::Handle>,
}
impl Drop for NextProc {
  fn drop(&mut self) {
    if let Some(child) = self.child.as_mut() {
      #[cfg(unix)]
      unsafe {
        let pid = child.id() as i32;
        if pid > 0 { let _ = killpg(pid, SIGTERM); }
        for _ in 0..10 {
          if child.try_wait().ok().flatten().is_some() { return; }
          thread::sleep(Duration::from_millis(100));
        }
        if pid > 0 { let _ = killpg(pid, SIGKILL); }
      }
      #[cfg(windows)]
      {
        // Job object with KILL_ON_JOB_CLOSE will handle descendants upon drop of handle.
        // Still issue a direct kill for faster teardown.
        let _ = child.kill();
      }
      #[cfg(all(not(unix), not(windows)))]
      {
        let _ = child.kill();
      }
    }
  }
}

fn main() {
  println!("Starting app");
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let port: u16 = std::env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(3333);
      println!("Using port {}", port);

      // In dev, rely on devUrl; in prod, spawn Next server and point window to it.
  let mut child_opt: Option<Child> = None;
  #[cfg(windows)]
  let job_handle = win_job::Handle::new_kill_on_close();
      let handle: AppHandle = app.handle().clone();
      let has_embedded_server = server_root(&handle).is_some();
      println!("Has embedded server: {}", has_embedded_server);
      if has_embedded_server {
        println!("Starting Next server");
        child_opt = spawn_next(&handle, port);
        #[cfg(windows)]
        if let (Some(ref ch), Some(ref job)) = (child_opt.as_ref(), job_handle.as_ref()) {
          job.assign(ch);
        }
        if !wait_for_port(port, 15_000) {
          eprintln!("Next server failed to start on port {}", port);
        }

        if let Some(win) = app.get_webview_window("main") {
          let _ = win.eval(&format!("location.replace('http://127.0.0.1:{}')", port));
        }
      }

      // Manage child lifetime (kill on drop/app exit)
  app.manage(NextProc { child: child_opt, #[cfg(windows)] job: job_handle });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}
