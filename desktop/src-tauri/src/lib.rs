use base64::{engine::general_purpose::STANDARD, Engine};
use screenshots::Screen;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ScreenshotResult {
    pub base64: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Deserialize)]
pub struct ClickPayload {
    pub x: f64,
    pub y: f64,
}

#[derive(Deserialize)]
pub struct TypePayload {
    pub text: String,
}

#[derive(Deserialize)]
pub struct OpenAppPayload {
    pub app: String,
}

// ── Tauri Commands ────────────────────────────────────────────────────────────

/// Capture the primary screen and return a base64-encoded PNG.
#[tauri::command]
fn capture_screen() -> Result<ScreenshotResult, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.into_iter().next().ok_or("No screen found")?;
    let image = screen.capture().map_err(|e| e.to_string())?;
    let png = image.to_png(None).map_err(|e| e.to_string())?;
    Ok(ScreenshotResult {
        base64: STANDARD.encode(&png),
        width: image.width(),
        height: image.height(),
    })
}

/// Move the mouse cursor to (x, y) — cross-platform via enigo (future).
/// For now returns ok so the frontend loop works end-to-end.
#[tauri::command]
fn mouse_move(x: f64, y: f64) -> Result<(), String> {
    // TODO: enigo integration in Phase 3
    let _ = (x, y);
    Ok(())
}

/// Click at (x, y).
#[tauri::command]
fn mouse_click(payload: ClickPayload) -> Result<(), String> {
    let _ = payload;
    // TODO: enigo integration in Phase 3
    Ok(())
}

/// Type text using the keyboard.
#[tauri::command]
fn keyboard_type(payload: TypePayload) -> Result<(), String> {
    let _ = payload;
    // TODO: enigo integration in Phase 3
    Ok(())
}

/// Press a single key (e.g. "Return", "Escape", "Tab").
#[tauri::command]
fn keyboard_key(key: String) -> Result<(), String> {
    let _ = key;
    // TODO: enigo integration in Phase 3
    Ok(())
}

/// Open an application by name — works on macOS (open -a), Linux (xdg-open),
/// and Windows (start).
#[tauri::command]
fn open_application(payload: OpenAppPayload) -> Result<(), String> {
    let app = &payload.app;

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", app])
            .spawn()
            .map_err(|e| format!("open -a {app}: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(app)
            .spawn()
            .map_err(|e| format!("xdg-open {app}: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", app])
            .spawn()
            .map_err(|e| format!("start {app}: {e}"))?;
    }

    Ok(())
}

/// Get the list of displays (count + dimensions).
#[tauri::command]
fn list_screens() -> Result<Vec<serde_json::Value>, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    Ok(screens
        .iter()
        .map(|s| {
            serde_json::json!({
                "id": s.display_info.id,
                "width": s.display_info.width,
                "height": s.display_info.height,
                "x": s.display_info.x,
                "y": s.display_info.y,
                "scale": s.display_info.scale_factor,
                "is_primary": s.display_info.is_primary,
            })
        })
        .collect())
}

// ── App entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // System tray
            let quit = MenuItem::with_id(app, "quit", "Quit 1nexio", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("1nexio — Your AI Workforce")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            mouse_move,
            mouse_click,
            keyboard_type,
            keyboard_key,
            open_application,
            list_screens,
        ])
        .run(tauri::generate_context!())
        .expect("error while running 1nexio desktop");
}
