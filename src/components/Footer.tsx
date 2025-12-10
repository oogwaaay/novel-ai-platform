import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="text-xl font-semibold text-white">
              Scribely
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-powered writing workspace. Create complete stories in minutes with Scribely, a novel ai style generator.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/generator" className="hover:text-white transition">
                  AI Novel Generator
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Free AI Tools */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Free AI Tools</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/ai-prompt-generator" className="hover:text-white transition">
                  AI Art Prompt Generator
                </Link>
              </li>
              <li>
                <Link to="/tools/fantasy-name-generator" className="hover:text-white transition">
                  Fantasy Name Generator
                </Link>
              </li>
              <li>
                <Link to="/generator" className="hover:text-white transition">
                  Micro-Novel Starter
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/resources" className="hover:text-white transition">
                  Guides & Tutorials
                </Link>
              </li>
              <li>
                <Link to="/updates" className="hover:text-white transition">
                  Release Notes
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-white transition">
                  Help Center
                </Link>
              </li>
              <li>
                <a href="mailto:support@scribelydesigns.top" className="hover:text-white transition">
                  support@scribelydesigns.top
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Scribely. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

