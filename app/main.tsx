import { SignInForm } from "@/components/SignInForm";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white text-xl font-bold">
              Smart Inventory
            </span>
          </div>
          <div className="hidden md:flex space-x-8 text-white/80">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              AI-Powered Inventory Management
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Never Run Out
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Of Stock Again
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your business with AI-powered demand forecasting and
              automated reordering. Increase profits, reduce waste, and delight
              customers.
            </p>

            {/* CTA Section */}
            <div className="mb-16">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto border border-white/20">
                <h3 className="text-white text-lg font-semibold mb-4">
                  Get Started Today
                </h3>
                <SignInForm />
                <p className="text-white/60 text-sm mt-4">
                  Free 14-day trial • No credit card required
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: "🤖",
                title: "AI-Powered Forecasting",
                description:
                  "Machine learning algorithms analyze your sales patterns and predict future demand with 95% accuracy",
                gradient: "from-blue-500/20 to-cyan-500/20",
              },
              {
                icon: "⚡",
                title: "Automated Reordering",
                description:
                  "Set it and forget it. Our system automatically reorders products before you run out of stock",
                gradient: "from-purple-500/20 to-pink-500/20",
              },
              {
                icon: "📊",
                title: "Advanced Analytics",
                description:
                  "Real-time insights and beautiful dashboards help you make data-driven inventory decisions",
                gradient: "from-emerald-500/20 to-teal-500/20",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className={`group relative p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-2`}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-white text-xl font-bold mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/80 leading-relaxed">
                  {feature.description}
                </p>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="text-center mb-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { number: "95%", label: "Forecast Accuracy" },
                { number: "40%", label: "Cost Reduction" },
                { number: "24/7", label: "Monitoring" },
                { number: "10K+", label: "Happy Customers" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-black text-white mb-2">
                    {stat.number}
                  </div>
                  <div className="text-white/60 text-sm uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Proof */}
          <div className="text-center">
            <p className="text-white/60 text-sm mb-6">
              Trusted by leading businesses worldwide
            </p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              {["Company A", "Business B", "Enterprise C", "Startup D"].map(
                (company, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-white/10 rounded-lg text-white/80 text-sm font-medium"
                  >
                    {company}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/60 text-sm">
            © 2025 Smart Inventory Management. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
