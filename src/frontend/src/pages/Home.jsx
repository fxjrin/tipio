import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, Eye, Zap, Gift, Lock, Check, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TipioLoader from '@/components/TipioLoader';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const { identity, loading, hasUsername } = useAuth();
  const navigate = useNavigate();

  // GSAP refs
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const ecosystemRef = useRef(null);
  const privacyRef = useRef(null);
  const ctaRef = useRef(null);

  // Redirect after login based on profile status
  useEffect(() => {
    if (identity.isAuthenticated && !loading) {
      if (hasUsername) {
        navigate('/dashboard');
      } else {
        navigate('/register');
      }
    }
  }, [loading, identity.isAuthenticated, hasUsername, navigate]);

  useEffect(() => {
    // Kill all existing ScrollTriggers to prevent duplicates
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    const ctx = gsap.context(() => {
      // Hero animations - direct animations without classes to avoid conflicts
      const heroTitle = document.querySelector('.hero-title');
      const heroSubtitle = document.querySelector('.hero-subtitle');
      const heroCta = document.querySelector('.hero-cta');
      const privacyBadges = document.querySelectorAll('.privacy-badge');

      if (heroTitle) {
        gsap.fromTo(heroTitle,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
        );
      }

      if (heroSubtitle) {
        gsap.fromTo(heroSubtitle,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: 'power3.out' }
        );
      }

      if (heroCta) {
        gsap.fromTo(heroCta,
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, delay: 0.4, ease: 'back.out(1.7)' }
        );
      }

      if (privacyBadges.length > 0) {
        gsap.fromTo(privacyBadges,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, stagger: 0.1, delay: 0.6, ease: 'back.out(1.7)' }
        );
      }

      // Features section with ScrollTrigger - set initial state immediately
      if (featuresRef.current) {
        const featureCards = featuresRef.current.querySelectorAll('.feature-card');
        if (featureCards.length > 0) {
          // Set initial state first
          gsap.set(featureCards, { y: 80, opacity: 0 });

          ScrollTrigger.create({
            trigger: featuresRef.current,
            start: 'top 80%',
            onEnter: () => {
              gsap.to(featureCards, {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power3.out'
              });
            },
            once: true
          });
        }
      }

      // How it works section - all from left
      if (howItWorksRef.current) {
        const stepCards = howItWorksRef.current.querySelectorAll('.step-card');
        if (stepCards.length > 0) {
          // Set initial state first
          gsap.set(stepCards, { x: -100, opacity: 0 });

          ScrollTrigger.create({
            trigger: howItWorksRef.current,
            start: 'top 80%',
            onEnter: () => {
              gsap.to(stepCards, {
                x: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power3.out'
              });
            },
            once: true
          });
        }
      }

      // Ecosystem section
      if (ecosystemRef.current) {
        const ecosystemLogos = ecosystemRef.current.querySelectorAll('.ecosystem-logo');
        if (ecosystemLogos.length > 0) {
          // Set initial state first
          gsap.set(ecosystemLogos, { y: 30, opacity: 0 });

          ScrollTrigger.create({
            trigger: ecosystemRef.current,
            start: 'top 80%',
            onEnter: () => {
              gsap.to(ecosystemLogos, {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power3.out'
              });
            },
            once: true
          });
        }
      }

      // Privacy section
      if (privacyRef.current) {
        const privacyFeatures = privacyRef.current.querySelectorAll('.privacy-feature');
        if (privacyFeatures.length > 0) {
          // Set initial state first
          gsap.set(privacyFeatures, { scale: 0.8, opacity: 0 });

          ScrollTrigger.create({
            trigger: privacyRef.current,
            start: 'top 80%',
            onEnter: () => {
              gsap.to(privacyFeatures, {
                scale: 1,
                opacity: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: 'back.out(1.7)'
              });
            },
            once: true
          });
        }
      }

      // Final CTA
      if (ctaRef.current) {
        const finalCta = ctaRef.current.querySelector('.final-cta');
        if (finalCta) {
          // Set initial state first
          gsap.set(finalCta, { y: 50, opacity: 0 });

          ScrollTrigger.create({
            trigger: ctaRef.current,
            start: 'top 80%',
            onEnter: () => {
              gsap.to(finalCta, {
                y: 0,
                opacity: 1,
                duration: 1,
                ease: 'power3.out'
              });
            },
            once: true
          });
        }
      }

      // Floating animation for decorative icons
      const floatingIcons = document.querySelectorAll('.floating-icon');
      if (floatingIcons.length > 0) {
        gsap.to(floatingIcons, {
          y: -15,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 0.3
        });
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div ref={heroRef} className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] bg-clip-text text-transparent">
              Tipio
            </h1>
          </div>
          <Button
            onClick={identity.login}
            disabled={identity.loading}
            variant="outline"
            size="sm"
            className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)]"
          >
            {identity.loading ? (
              <TipioLoader size={16} variant="white" />
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                Login
              </>
            )}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="floating-icon absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-[var(--brand-yellow)]/20 to-[var(--brand-orange)]/20 rounded-full blur-2xl" />
          <div className="floating-icon absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-[var(--brand-pink)]/20 to-[var(--brand-orange)]/20 rounded-full blur-3xl" />
          <div className="floating-icon absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-br from-[var(--brand-yellow)]/20 to-[var(--brand-pink)]/20 rounded-full blur-2xl" />
        </div>

        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12">
            <h1 className="hero-title text-6xl md:text-7xl lg:text-8xl font-black mb-6 bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] bg-clip-text text-transparent leading-tight">
              Accept Tips<br />Privately & Securely
            </h1>
            <p className="hero-subtitle text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Tipio generates a unique address for every transaction, protecting your privacy while making tipping simple and secure on the Internet Computer.
            </p>

            {/* Privacy Badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <div className="privacy-badge flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Unique Addresses</span>
              </div>
              <div className="privacy-badge flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">No Tracking</span>
              </div>
              <div className="privacy-badge flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
                <Lock className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Fully Decentralized</span>
              </div>
            </div>

            {/* CTA */}
            <div className="hero-cta">
              <Button
                onClick={identity.login}
                disabled={identity.loading}
                size="lg"
                className="group text-lg px-12 py-8 font-bold bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                {identity.loading ? (
                  <span className="flex items-center gap-3">
                    <TipioLoader size={24} variant="colored" />
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    Get Started with Internet Identity
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Free forever • No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Tipio?</h2>
            <p className="text-xl text-muted-foreground">Built for creators who value privacy and simplicity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="feature-card group bg-card rounded-3xl p-8 border border-border hover:border-[var(--brand-yellow)] hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Privacy First</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every tip generates a unique subaccount address. Your main address stays private, protecting you from tracking and analysis.
              </p>
            </div>

            <div className="feature-card group bg-card rounded-3xl p-8 border border-border hover:border-[var(--brand-yellow)] hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 mb-6 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built on Internet Computer for instant notifications. See your tips in real-time without waiting for confirmations.
              </p>
            </div>

            <div className="feature-card group bg-card rounded-3xl p-8 border border-border hover:border-[var(--brand-yellow)] hover:shadow-2xl transition-all duration-300">
              <div className="w-16 h-16 mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Simple Setup</h3>
              <p className="text-muted-foreground leading-relaxed">
                No complicated wallets or seed phrases. Login with Internet Identity and start receiving ICP, ckBTC, and ckUSDC instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How Tipio Protects Your Privacy</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every transaction gets its own unique address, making your tips untraceable
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="step-card flex flex-col md:flex-row items-center gap-8 p-8 bg-card rounded-3xl border border-border">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[var(--brand-yellow)] to-[var(--brand-orange)] rounded-2xl flex items-center justify-center text-2xl font-black text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Someone Visits Your Link</h3>
                <p className="text-muted-foreground leading-relaxed">
                  When someone opens your Tipio link, we instantly generate a brand new subaccount address just for that transaction.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--brand-yellow)]/20 to-[var(--brand-orange)]/20 rounded-2xl flex items-center justify-center">
                  <RefreshCw className="w-10 h-10 text-[var(--brand-yellow)]" />
                </div>
              </div>
            </div>

            {/* Step 2 - Now left aligned like the others */}
            <div className="step-card flex flex-col md:flex-row items-center gap-8 p-8 bg-card rounded-3xl border border-border">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">They Send the Tip</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The tipper sends crypto to that unique address. This address is used only once and never linked to your main account.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-2xl flex items-center justify-center">
                  <Gift className="w-10 h-10 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="step-card flex flex-col md:flex-row items-center gap-8 p-8 bg-card rounded-3xl border border-border">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">You Withdraw Privately</h3>
                <p className="text-muted-foreground leading-relaxed">
                  When you withdraw, funds are transferred to your personal wallet. No one can connect your tips together or trace your earnings.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center">
                  <Shield className="w-10 h-10 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section ref={ecosystemRef} className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Built on the Internet Computer</h2>
            <p className="text-xl text-muted-foreground">Powered by cutting-edge blockchain technology</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center justify-items-center">
            {/* Internet Computer */}
            <a
              href="https://internetcomputer.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="ecosystem-logo flex flex-col items-center gap-3 p-6 hover:scale-110 transition-transform duration-300 cursor-pointer"
            >
              <img
                src="/ecosystem/internet-computer.svg"
                alt="Internet Computer"
                className="h-16 w-auto object-contain transition-all"
              />
              <span className="text-sm text-muted-foreground font-medium">Internet Computer</span>
            </a>

            {/* OISY Wallet */}
            <a
              href="https://oisy.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="ecosystem-logo flex flex-col items-center gap-3 p-6 hover:scale-110 transition-transform duration-300 cursor-pointer"
            >
              <img
                src="/ecosystem/oisy-wallet.svg"
                alt="OISY Wallet"
                className="h-16 w-auto object-contain transition-all"
              />
              <span className="text-sm text-muted-foreground font-medium">OISY Wallet</span>
            </a>

            {/* Plug Wallet */}
            <a
              href="https://plugwallet.ooo/"
              target="_blank"
              rel="noopener noreferrer"
              className="ecosystem-logo flex flex-col items-center gap-3 p-6 hover:scale-110 transition-transform duration-300 cursor-pointer"
            >
              <img
                src="/ecosystem/plug-wallet.svg"
                alt="Plug Wallet"
                className="h-16 w-auto object-contain transition-all"
              />
              <span className="text-sm text-muted-foreground font-medium">Plug Wallet</span>
            </a>

            {/* Chain Fusion */}
            <a
              href="https://internetcomputer.org/chainfusion"
              target="_blank"
              rel="noopener noreferrer"
              className="ecosystem-logo flex flex-col items-center gap-3 p-6 hover:scale-110 transition-transform duration-300 cursor-pointer"
            >
              <img
                src="/ecosystem/chain-fusion.svg"
                alt="Chain Fusion"
                className="h-16 w-auto object-contain text-foreground transition-all"
              />
              <span className="text-sm text-muted-foreground font-medium">Chain Fusion</span>
            </a>
          </div>
        </div>
      </section>

      {/* Privacy Features Section */}
      <section ref={privacyRef} className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Privacy by Design</h2>
            <p className="text-xl text-muted-foreground">Security features built into every transaction</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="privacy-feature flex items-start gap-4 p-6 bg-card rounded-2xl border border-border">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">Unique Addresses Per Transaction</h4>
                <p className="text-sm text-muted-foreground">Every tip gets its own address, making correlation impossible</p>
              </div>
            </div>

            <div className="privacy-feature flex items-start gap-4 p-6 bg-card rounded-2xl border border-border">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">No Personal Information Required</h4>
                <p className="text-sm text-muted-foreground">Just a username. No email, no KYC, no tracking</p>
              </div>
            </div>

            <div className="privacy-feature flex items-start gap-4 p-6 bg-card rounded-2xl border border-border">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">Decentralized Authentication</h4>
                <p className="text-sm text-muted-foreground">Internet Identity keeps your login private and secure</p>
              </div>
            </div>

            <div className="privacy-feature flex items-start gap-4 p-6 bg-card rounded-2xl border border-border">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">On-Chain Privacy</h4>
                <p className="text-sm text-muted-foreground">Your tips are stored securely on the blockchain</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={ctaRef} className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="final-cta text-center bg-gradient-to-br from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Ready to Accept Tips Privately?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join creators who value privacy and security. Get started in less than 60 seconds.
              </p>
              <Button
                onClick={identity.login}
                disabled={identity.loading}
                size="lg"
                className="bg-white text-[var(--brand-orange)] hover:bg-white/90 text-lg px-12 py-8 font-bold hover:scale-105 transition-all duration-300"
              >
                {identity.loading ? (
                  <TipioLoader size={24} variant="colored" />
                ) : (
                  <span className="flex items-center gap-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    Create Your Tipio Account
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-pink)] bg-clip-text text-transparent">
                Tipio
              </h1>
              <span className="text-sm text-muted-foreground">• Privacy-First Tipping</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Powered by Internet Computer</span>
              <span>•</span>
              <span>Secured by Internet Identity</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
