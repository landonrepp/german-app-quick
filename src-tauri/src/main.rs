#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{process::{Command, Stdio, Child}, io::{BufRead, BufReader}, thread, time::Duration, net::TcpStream, path::PathBuf};
use tauri::{Manager, AppHandle};

fn server_root(app: &AppHandle) -> Option<PathBuf> {
  // Look for bundled Next standalone under resources
  if let Ok(res_dir) = app.path().resource_dir() {
    let p = res_dir.join(".next").join("standalone");
    if p.join("server.js").exists() { return Some(p); }
  }
  None
}

fn spawn_next(app: &AppHandle, port: u16) -> Option<Child> {
  let root = server_root(app)?;
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

struct NextProc { child: Option<Child> }
impl Drop for NextProc { fn drop(&mut self) { if let Some(child) = self.child.as_mut() { let _ = child.kill(); } } }

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let port: u16 = std::env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(3333);

      // In dev, rely on devUrl; in prod, spawn Next server and point window to it.
      let mut child_opt: Option<Child> = None;
      let handle: AppHandle = app.handle().clone();
      let has_embedded_server = server_root(&handle).is_some();
      if has_embedded_server {
        child_opt = spawn_next(&handle, port);
        if !wait_for_port(port, 15_000) {
          eprintln!("Next server failed to start on port {}", port);
        }

        if let Some(win) = app.get_webview_window("main") {
          let _ = win.eval(&format!("location.replace('http://127.0.0.1:{}')", port));
        }
      }

      // Manage child lifetime (kill on drop/app exit)
      app.manage(NextProc { child: child_opt });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Tauri application");
}
