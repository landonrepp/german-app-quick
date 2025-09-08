#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console on Windows release

use std::{process::{Command, Stdio, Child}, thread, time::Duration, net::TcpStream, sync::Mutex, io::{BufRead, BufReader, Write}};
use tauri::{Manager, Menu, Submenu, CustomMenuItem, MenuItem, WindowMenuEvent};

struct ServerState(Mutex<Option<Child>>);

const SERVER_PORT: u16 = 3333; // Must match PORT env below

fn wait_for_server(port: u16, attempts: u32, delay_ms: u64) -> bool {
    for _ in 0..attempts {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() { return true; }
        thread::sleep(Duration::from_millis(delay_ms));
    }
    false
}

fn spawn_next_server(app_handle: &tauri::AppHandle, resource_dir: &std::path::Path) -> std::io::Result<Child> {
    // In bundle, standalone server.js lives at resources/next-standalone/server.js
    let server_js = resource_dir.join("next-standalone/server.js");
    if !server_js.exists() {
        eprintln!("server.js not found at {:?}", server_js);
    }
    let mut cmd = Command::new("node"); // relies on system Node or sidecar if provided
    cmd.arg(server_js);
    cmd.current_dir(resource_dir);
    cmd.env("PORT", SERVER_PORT.to_string());
    // Provide persistent DB path under app data dir
    if let Some(app_data) = tauri::api::path::app_data_dir(&tauri::Config::default()) {
        let _ = std::fs::create_dir_all(&app_data);
        cmd.env("SQLITE_DB_PATH", app_data.join("db.sqlite"));
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn()?;

    // Prepare optional log file (best-effort)
    let log_file_path = app_handle
        .path_resolver()
        .app_log_dir()
        .or_else(|| app_handle.path_resolver().app_data_dir())
        .map(|p| p.join("next-server.log"));

    if let Some(stdout) = child.stdout.take() {
        let handle = app_handle.clone();
        let log_path = log_file_path.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            let mut file = log_path.and_then(|lp| {
                std::fs::create_dir_all(lp.parent().unwrap_or(std::path::Path::new("."))).ok()?;
                std::fs::OpenOptions::new().create(true).append(true).open(lp).ok()
            });
            for line in reader.lines().flatten() {
                // Emit event
                let _ = handle.emit_all("next-log", serde_json::json!({"stream":"stdout","line":line}));
                // Mirror to parent stdout
                println!("[next stdout] {line}");
                // Persist
                if let Some(f) = file.as_mut() { let _ = writeln!(f, "[stdout] {line}"); }
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        let handle = app_handle.clone();
        let log_path = log_file_path.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            let mut file = log_path.and_then(|lp| {
                std::fs::create_dir_all(lp.parent().unwrap_or(std::path::Path::new("."))).ok()?;
                std::fs::OpenOptions::new().create(true).append(true).open(lp).ok()
            });
            for line in reader.lines().flatten() {
                let _ = handle.emit_all("next-log", serde_json::json!({"stream":"stderr","line":line}));
                eprintln!("[next stderr] {line}");
                if let Some(f) = file.as_mut() { let _ = writeln!(f, "[stderr] {line}"); }
            }
        });
    }
    Ok(child)
}

fn kill_server(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<ServerState>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(child) = guard.as_mut() {
                let _ = child.kill();
                // Best-effort wait (non-fatal if it errors)
                let _ = child.wait();
            }
            *guard = None;
        }
    }
}

fn main() {
    let devtools_item = CustomMenuItem::new("toggle-devtools", "Toggle DevTools");
    let reload_item = CustomMenuItem::new("reload", "Reload");
    let app_sub = Submenu::new("App", Menu::new().add_item(devtools_item.clone()).add_item(reload_item.clone()).add_native_item(MenuItem::Quit));
    let view_sub = Submenu::new("View", Menu::new().add_native_item(MenuItem::EnterFullScreen));
    let menu = Menu::new().add_submenu(app_sub).add_submenu(view_sub);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event: WindowMenuEvent| {
            let win = event.window();
            match event.menu_item_id() {
                "toggle-devtools" => { let _ = win.open_devtools(); }
                "reload" => { let _ = win.eval("location.reload()"); }
                _ => {}
            }
        })
        .manage(ServerState(Mutex::new(None)))
        .setup(|app| {
            // Only spawn the server in production build (tauri build) - during dev we rely on next dev
            let dev = cfg!(debug_assertions);
            if !dev {
                let resource_dir = app.path_resolver().resource_dir().ok_or("No resource dir")?;
                let child = spawn_next_server(&app.handle(), &resource_dir).map_err(|e| format!("Failed to spawn Next server: {e}"))?;
                {
                    let state = app.state::<ServerState>();
                    *state.0.lock().unwrap() = Some(child);
                }
                // Wait for server then navigate window
                if wait_for_server(SERVER_PORT, 200, 50) { // up to 10s
                    if let Some(window) = app.get_window("main") {
                        window.eval(&format!("window.location.replace('http://127.0.0.1:{SERVER_PORT}');")).ok();
                    }
                } else {
                    eprintln!("Timed out waiting for internal Next.js server on port {SERVER_PORT}");
                }
            } else {
                // In dev, window URL is provided by `devUrl` (http://localhost:3000)
            }
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                let app = event.window().app_handle();
                kill_server(&app);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } => {
                    kill_server(&app_handle);
                }
                tauri::RunEvent::Exit { .. } => {
                    kill_server(&app_handle);
                }
                _ => {}
            }
        });
}
