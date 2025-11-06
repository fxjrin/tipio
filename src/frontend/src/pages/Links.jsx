import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, QrCode, Share2, Link as LinkIcon, Plus, DollarSign, Package, Send, Target, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import QRModal from '@/components/QRModal';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export default function Links() {
  const { userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  if (!userProfile) {
    return null;
  }

  const tipLink = `${window.location.origin}/${userProfile.username}`;

  const copyTipLink = () => {
    navigator.clipboard.writeText(tipLink);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTipLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Send me a tip on Tipio',
          text: `Support me on Tipio!`,
          url: tipLink,
        });
      } catch (error) {
        // Error sharing, fallback to copy
      }
    } else {
      copyTipLink();
    }
  };

  const generateQR = async () => {
    try {
      const url = await QRCode.toDataURL(tipLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(url);
      setShowQR(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `tipio-${userProfile.username}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar currentPage="links" userProfile={userProfile} />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page Title with Action */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Links</h1>
            <p className="text-muted-foreground mt-1">Manage your payment links</p>
          </div>
          <Button
            onClick={() => setShowTemplates(!showTemplates)}
            className="bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Link
          </Button>
        </div>

        {/* Template Selection Modal */}
        {showTemplates && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative bg-card rounded-3xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
              {/* Close Button */}
              <button
                onClick={() => setShowTemplates(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Choose a Template</h2>
                <p className="text-muted-foreground">Select the perfect link type for your needs</p>
              </div>

              {/* Popular Templates */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Popular</h3>
                <div className="space-y-3">
                  {/* Simple Payment - Active */}
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-2xl cursor-pointer hover:shadow-lg transition-all">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <DollarSign className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold">Simple Payment</h4>
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Accept tips and payments with one universal link. Simple, fast, and perfect for creators.
                      </p>
                      <p className="text-xs text-green-700 font-medium">Best for: Content creators, freelancers, personal use</p>
                    </div>
                  </div>

                  {/* Digital Product - Coming Soon */}
                  <div className="flex items-start gap-4 p-5 bg-muted/20 border border-border rounded-2xl opacity-60 cursor-not-allowed">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold">Digital Product</h4>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-full">Coming Soon</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Sell ebooks, templates, courses, and more. Auto-deliver files after payment confirmation.
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">Best for: Selling digital downloads, courses, presets</p>
                    </div>
                  </div>

                  {/* Payment Request - Coming Soon */}
                  <div className="flex items-start gap-4 p-5 bg-muted/20 border border-border rounded-2xl opacity-60 cursor-not-allowed">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Send className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold">Payment Request</h4>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-full">Coming Soon</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Send personalized payment requests to specific people. Track who paid and send reminders.
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">Best for: Splitting bills, collecting payments, invoicing</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* More Options */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">More Options</h3>
                <div className="space-y-3">
                  {/* Fundraiser - Coming Soon */}
                  <div className="flex items-start gap-4 p-5 bg-muted/20 border border-border rounded-2xl opacity-60 cursor-not-allowed">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Target className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold">Fundraiser</h4>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-full">Coming Soon</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Create goal-based campaigns with progress tracking. Show supporters how close you are to your target.
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">Best for: Charity drives, community projects, personal goals</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content - Centered */}
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Active Link - Simple Payment */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Simple Payment</h3>
                  <p className="text-xs text-muted-foreground">Your active tip link</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">Active</span>
            </div>

            {/* Link Display */}
            <div className="bg-muted rounded-xl p-4 mb-4 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg flex-shrink-0"
                  style={{ backgroundColor: userProfile.avatarBackgroundColor || '#f7931a' }}
                >
                  {userProfile.avatarEmoji || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">@{userProfile.username}</p>
                  <p className="text-sm text-muted-foreground font-mono truncate">{tipLink}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={copyTipLink}
                size="sm"
                className="bg-gradient-to-r from-[var(--brand-yellow)] to-[var(--brand-orange)] hover:opacity-90"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                onClick={shareTipLink}
                size="sm"
                variant="outline"
                className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)]"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Share
              </Button>
              <Button
                onClick={generateQR}
                size="sm"
                variant="outline"
                className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)]"
              >
                <QrCode className="h-3 w-3 mr-1" />
                QR
              </Button>
              <Button
                onClick={() => window.open(tipLink, '_blank')}
                size="sm"
                variant="outline"
                className="hover:bg-[var(--brand-yellow)] hover:text-black hover:border-[var(--brand-yellow)]"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* QR Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        qrDataUrl={qrDataUrl}
        username={userProfile.username}
        onDownload={downloadQR}
      />
    </div>
  );
}
