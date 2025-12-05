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
        <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-8 inline-block">
          ← Back to home
        </Link>
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

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Your Rights</h2>
          <p>
            Depending on your location, you may have the right to access, correct, or delete your personal data. You can
            also request export of your data or closure of your account by contacting us.
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

