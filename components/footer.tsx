import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-xl lg:max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted">
        <nav className="flex flex-wrap justify-center gap-4 mb-2">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/faq" className="hover:text-foreground">
            FAQ
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground"
          >
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
        © Calex Digital 2026
      </div>
    </footer>
  );
}