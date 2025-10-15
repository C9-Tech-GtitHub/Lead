import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Lead Research Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover, research, and grade local businesses automatically using AI.
            Scale your outreach with intelligent lead analysis.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <FeatureCard
              title="Automated Scraping"
              description="Search entire cities for specific business types using Google Maps data"
              icon="🔍"
            />
            <FeatureCard
              title="AI-Powered Analysis"
              description="GPT-5 analyzes each business's website, team, and growth potential"
              icon="🤖"
            />
            <FeatureCard
              title="Smart Grading"
              description="Get A-F compatibility scores with actionable outreach suggestions"
              icon="📊"
            />
            <FeatureCard
              title="Real-time Updates"
              description="Watch your leads being researched and analyzed in real-time"
              icon="⚡"
            />
            <FeatureCard
              title="Detailed Reports"
              description="View pain points, opportunities, and suggested hooks for each lead"
              icon="📝"
            />
            <FeatureCard
              title="Scale Effortlessly"
              description="Process 5-50 leads per run, with city-wide search capabilities"
              icon="🚀"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
