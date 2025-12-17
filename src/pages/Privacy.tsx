import { SEO } from '../components/SEO';
import { Link } from 'react-router-dom';

export default function Privacy() {
  const lastUpdated = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white min-h-screen py-16">
      <SEO
        title="Privacy Policy - Scribely"
        description="Privacy Policy for Scribely. Learn how we collect, use, and protect your data."
        keywords="privacy policy, data protection, scribely"
        image="https://scribelydesigns.top/brand1090.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'PrivacyPolicy',
          name: 'Scribely Privacy Policy',
          url: 'https://scribelydesigns.top/privacy',
          dateModified: lastUpdated,
          publisher: {
            '@type': 'Organization',
            name: 'Scribely',
            url: 'https://scribelydesigns.top'
          }
        }}
      />
      <div className="max-w-3xl mx-auto px-4">
        {/* Navigation Links */}
        <nav className="flex gap-6 text-sm font-medium mb-8">
          <Link to="/" className="text-indigo-600 hover:text-indigo-700">
            ← Back to home
          </Link>
          <Link to="/terms" className="text-slate-600 hover:text-indigo-600">
            Terms of Service
          </Link>
          <Link to="/generator" className="text-slate-600 hover:text-indigo-600">
            Try AI Generator
          </Link>
          <Link to="/tools/fantasy-name-generator" className="text-slate-600 hover:text-indigo-600">
            Fantasy Name Generator
          </Link>
        </nav>
        <h1 className="text-4xl font-semibold text-slate-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
          <p>
            At Scribely, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect
            your information when you use our website and services.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul>
            <li>
              <strong>Account information</strong> such as your email address, name, and subscription details when you
              create an account.
            </li>
            <li>
              <strong>Usage data</strong> such as projects, word counts, and generation statistics to provide analytics
              and enforce fair usage limits.
            </li>
            <li>
              <strong>Technical data</strong> such as IP address, browser type, and device information for security and
              performance monitoring.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">How We Use Your Information</h2>
          <p>We use the information we collect in order to:</p>
          <ul>
            <li>Provide and maintain the Scribely service, including saving your projects and settings.</li>
            <li>Improve the product experience, such as optimizing performance and understanding feature adoption.</li>
            <li>Communicate with you about updates, support tickets, and important service notices.</li>
            <li>Enforce subscription limits and prevent abuse or unauthorized access.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Data Processors & AI Providers</h2>
          <p>
            We may rely on third-party infrastructure and AI providers to process your text securely on our behalf. We
            only share the minimum data required to deliver the feature, and we prohibit providers from using your
            content to train their public models.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction. While no system can be 100% secure, we monitor
            access patterns and maintain backups to reduce risk.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to enhance your experience, analyze site traffic, and personalize content. 
            Cookies are small text files stored on your device that help us remember your preferences and improve our services.
          </p>
          <p>We use the following types of cookies:</p>
          <ul>
            <li>
              <strong>Necessary cookies</strong>: These cookies are essential for the operation of our website and cannot be disabled.
              They enable basic functions like page navigation and access to secure areas.
            </li>
            <li>
              <strong>Analytics cookies</strong>: We use Ahrefs Analytics to collect information about how you use our website,
              such as which pages you visit most often and how you arrived at our site. This data helps us improve our services.
            </li>
            <li>
              <strong>Preference cookies</strong>: These cookies remember your preferences and settings, such as language and theme,
              to provide a more personalized experience.
            </li>
          </ul>
          <p>
            You can manage your cookie preferences through your browser settings or by using the cookie consent banner on our website.
            Please note that disabling certain cookies may affect the functionality of our services.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide you with our services.
            After your account is closed, we will retain your data for a reasonable period to comply with legal obligations,
            resolve disputes, and enforce our agreements.
          </p>
          <ul>
            <li>Account information: Retained for 30 days after account closure, then deleted</li>
            <li>Usage data: Retained for 12 months for analytics purposes</li>
            <li>Project data: Deleted immediately upon account closure, unless required by law</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Data Breach Notification</h2>
          <p>
            In the event of a data breach that may affect your personal information, we will notify you and relevant authorities
            within 72 hours, in accordance with applicable laws. We will provide information about the nature of the breach,
            the types of data involved, and the steps you can take to protect yourself.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Children's Privacy</h2>
          <p>
            Our services are not intended for children under the age of 13. We do not knowingly collect personal information
            from children under 13. If we become aware that we have collected such information, we will take immediate steps
            to delete it from our systems.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries outside your country of residence, including
            the United States. We ensure that appropriate safeguards are in place to protect your data as required by applicable laws,
            such as standard contractual clauses or other approved mechanisms.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Your Rights</h2>
          <p>
            Depending on your location, you may have the right to:
          </p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Delete your personal data</li>
            <li>Export your data in a portable format</li>
            <li>Restrict or object to the processing of your data</li>
            <li>Withdraw consent at any time (where processing is based on consent)</li>
          </ul>
          <p>
            You can exercise these rights by contacting us at <a href="mailto:support@scribelydesigns.top">support@scribelydesigns.top</a>
            or through your account settings.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or how we handle your data, please contact us at{' '}
            <a href="mailto:support@scribelydesigns.top">support@scribelydesigns.top</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

