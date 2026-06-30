// Shown in the content area (the header/footer in the layout stay put) while a
// puzzle is generated server-side, e.g. when switching to Expert and the full
// graph is searched.
export default function Loading() {
  return (
    <div className="py-20 text-center text-sm text-muted">
      Loading player database…
    </div>
  );
}
