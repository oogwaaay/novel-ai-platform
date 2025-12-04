import { SEO } from '../components/SEO';
import { Link } from 'react-router-dom';

export default function Terms() {
  const lastUpdated = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white min-h-screen py-16">
      <SEO
        title="Terms of Service - Scribely"
        description="Terms of Service for Scribely. Read the rules and conditions for using our writing tools."
        keywords="terms of service, terms and conditions, scribely"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TermsOfService',
          name: 'Scribely Terms of Service',
          url: 'https://scribelydesigns.top/terms',
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
        <h1 className="text-4xl font-semibold text-slate-900 mb-8">Terms of Service</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
          <p>
            By accessing and using Scribely, you agree to be bound by these Terms of Service. If you do not agree to
            these terms, you should not use the service.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Use of Service</h2>
          <p>
            You may use our service for lawful purposes only. You agree not to use the service in any way that violates
            applicable laws or regulations, infringes on intellectual property rights, or harms other users.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Accounts & Subscriptions</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account. Subscription tiers (Free, Starter, Pro, Unlimited) unlock different feature
            sets and usage limits as described on the Pricing page.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">User Content & Intellectual Property</h2>
          <p>
            The content you create with Scribely belongs to you. By using the service, you grant us a limited license to
            store, process, and back up your content solely for the purpose of operating and improving the product.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">AI-Generated Content</h2>
          <p>
            Our tools rely on AI models that may occasionally produce inaccurate or inappropriate output. You are
            responsible for reviewing, editing, and fact-checking AI-generated text before publishing or relying on it.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Service Changes & Availability</h2>
          <p>
            We may update, suspend, or discontinue parts of the service from time to time. We aim to minimize
            interruptions, but we do not guarantee uninterrupted availability.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Limitation of Liability</h2>
          <p>
            Scribely is provided &quot;as is&quot; without warranties of any kind, express or implied. To the maximum
            extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from
            your use of the service.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at{' '}
            <a href="mailto:support@scribelydesigns.top">support@scribelydesigns.top</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

