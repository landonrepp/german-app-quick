fn main() {
  // Allow build to proceed even if Next.js artifacts not present yet; they are added pre-bundle.
  // Prevent tauri-build from failing on resource path existence checks by ensuring config loads.
  tauri_build::build();
}