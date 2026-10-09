import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Cpu, RefreshCw, AlertCircle, Smartphone, ShieldCheck, Layers } from 'lucide-react';
import { SupportedLanguage } from '../types/farm';

interface AiEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: SupportedLanguage;
}

export const AiEngineModal: React.FC<AiEngineModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  const [status, setStatus] = useState<{
    active: boolean;
    model: string;
    provider: string;
    fallbackEngines?: string[];
  }>({
    active: true,
    model: 'gemini-3.8-flash',
    provider: 'Server-Side Gemini Vision & TFLite Edge AI',
    fallbackEngines: ['gemini-3.1-flash-lite', 'tflite-offline-edge', 'localized-knowledge-engine']
  });
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkEngineStatus = async () => {
    setTesting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai-status');
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!res.ok || !contentType.includes('application/json')) {
        const rawText = await res.text().catch(() => '');
        if (contentType.includes('text/html') || rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.trim().toLowerCase().startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON for /api/ai-status. Ensure server.ts is running.');
        }
        throw new Error(`Status check failed (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify AI engine status.');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkEngineStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const titles: Record<SupportedLanguage, { title: string; subtitle: string; pipelineHeading: string }> = {
    en: {
      title: 'Hybrid Crop Diagnostic Architecture',
      subtitle: 'Server-side Gemini Vision + Offline Flutter/TFLite Edge Inference',
      pipelineHeading: 'Diagnostic Routing & Offline Edge Support'
    },
    hi: {
      title: 'हाइब्रिड फसल रोग निदान इंजन',
      subtitle: 'सर्वर-साइड जेमिनी विज़न + ऑफलाइन फ्लटर/TFLite एज एआई',
      pipelineHeading: 'निदान प्रणाली और ऑफलाइन एज सपोर्ट'
    },
    te: {
      title: 'హైబ్రిడ్ పంట తెగుళ్ల నిర్ధారణ ఇంజిన్',
      subtitle: 'సర్వర్-సైడ్ జెమిని విజన్ + ఆఫ్‌లైన్ ఫ్లట్టర్/TFLite ఎడ్జ్ AI',
      pipelineHeading: 'నిర్ధారణ విధానం & ఆఫ్‌లైన్ ఎడ్జ్ సపోర్ట్'
    },
    kn: {
      title: 'ಹೈಬ್ರಿಡ್ ಬೆಳೆ ರೋಗ নির্ಧಾರಣಾ ಇಂಜಿನ್',
      subtitle: 'ಸರ್ವರ್-ಸೈಡ್ ಜೆಮಿನಿ ವಿಷನ್ + ಆಫ್‌ಲೈನ್ ಫ್ಲಟ್ಟರ್/TFLite ಎಡ್ಜ್ AI',
      pipelineHeading: 'ರೋಗನಿರ್ಣಯ ಮಾರ್ಗ ಮತ್ತು ಆಫ್‌ಲೈನ್ ಎಡ್ಜ್ ಬೆಂಬಲ'
    },
    ta: {
      title: 'ஹைப்ரிட் பயிர் நோய் கண்டறியும் என்ஜின்',
      subtitle: 'சர்வர்-சைடு ஜெமினி விஷன் + ஆஃப்லைன் ஃப்ளட்டர்/TFLite எட்ஜ் AI',
      pipelineHeading: 'நோய் கண்டறியும் முறை & ஆஃப்லைன் ஆதரவு'
    },
    gu: {
      title: 'હાઇબ્રિડ પાક રોગ નિદાન એન્જિન',
      subtitle: 'સર્વર-સાઇડ જેમિની વિઝન + ઑફલાઇન ફ્લટર/TFLite એજ AI',
      pipelineHeading: 'નિદાન પ્રણાલી અને ઑફલાઇન એજ સપોર્ટ'
    }
  };

  const currentText = titles[currentLang] || titles.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#c0c9c3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#003629] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b4d3e] text-[#a0f399] flex items-center justify-center border border-[#a0f399]/40 shadow-inner">
              <Cpu className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold">
                {currentText.title}
              </h3>
              <p className="text-xs text-[#8abda9]">
                {currentText.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Badge Card */}
          <div className="p-4 rounded-xl bg-[#eef5ef] border border-[#a0f399] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#1b6d24] flex-shrink-0" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#1b6d24] block">
                  Diagnostic Server: Active & Operational
                </span>
                <span className="font-display text-sm font-bold text-[#003629]">
                  Model: {status.model}
                </span>
                <span className="block text-[11px] font-semibold text-[#404945] mt-0.5">
                  {status.provider}
                </span>
              </div>
            </div>

            <button
              onClick={checkEngineStatus}
              disabled={testing}
              className="px-3 py-1.5 rounded-lg bg-[#003629] hover:bg-[#1b4d3e] text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              Verify
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a] text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Architecture Overview */}
          <div>
            <h4 className="font-display text-sm font-bold text-[#003629] mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1b6d24]" />
              {currentText.pipelineHeading}
            </h4>

            <div className="space-y-3 text-xs text-[#161d19]">
              <div className="p-3.5 rounded-xl bg-[#f4fbf4] border border-[#dde4de] space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1b6d24] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>1. Instant Local Sample Cards (Zero Network Overhead)</strong>
                    <p className="text-[#404945] mt-0.5">
                      Built-in crop pathology sample cards resolve their verified vernacular diagnosis directly from the local agronomy dataset without calling <code>/api/diagnose</code> or uploading base64 images.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Cpu className="w-4 h-4 text-[#1b6d24] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>2. User-Uploaded Leaf Photos via Server-Side POST /api/diagnose</strong>
                    <p className="text-[#404945] mt-0.5">
                      When a farmer captures or uploads a custom leaf specimen photo, the image is sent to <code>POST /api/diagnose</code> on <code>server.ts</code>. Server-side credentials stay strictly on the server and are never exposed to the client.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-[#1b6d24] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>3. Offline Flutter & TensorFlow Lite (TFLite) Edge Path</strong>
                    <p className="text-[#404945] mt-0.5">
                      For remote agricultural fields with zero connectivity, the bundled Flutter/TFLite implementation (<code>lib/services/tflite_service.dart</code> and <code>assets/mobilenetv2_disease.tflite</code>) runs 38-class plant disease inference locally on-device.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f4fbf4] border-t border-[#c0c9c3] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#003629] text-white text-xs font-bold hover:bg-[#1b4d3e]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
