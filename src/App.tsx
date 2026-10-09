/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AndroidTopBar } from './components/AndroidTopBar';
import { AndroidNavBar } from './components/AndroidNavBar';
import { ScannerHero } from './components/ScannerHero';
import { DiagnosisResult } from './components/DiagnosisResult';
import { CalculatorPage } from './components/CalculatorPage';
import { CropGuidePage } from './components/CropGuidePage';
import { HistoryPage } from './components/HistoryPage';
import { FlutterExportModal } from './components/FlutterExportModal';
import { AiEngineModal } from './components/AiEngineModal';
import { CropSample, CropDiagnosis, HistoryItem, SupportedLanguage, AndroidAppTab } from './types/farm';
import { TRANSLATIONS } from './data/translations';
import { getLocalizedSamples } from './data/samples';
import { getCleanFallbackDiagnosis } from './data/localizedDiagnoses';
import { AlertCircle, Scan } from 'lucide-react';

const STORAGE_KEY_HISTORY = 'farm_crop_scan_history';
const STORAGE_KEY_LANG = 'farm_crop_preferred_lang';
const STORAGE_KEY_CONTRAST = 'farm_crop_high_contrast';

async function parseJsonApiResponse<T = any>(res: Response, endpointName: string): Promise<T> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `${endpointName} failed with HTTP ${res.status}.`);
    }
    const rawText = await res.text().catch(() => '');
    const trimmed = rawText.trim().toLowerCase();
    if (contentType.includes('text/html') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      throw new Error(
        `Server returned HTML instead of JSON for ${endpointName} (HTTP ${res.status}). Ensure server.ts is running and serving ${endpointName}.`
      );
    }
    throw new Error(`${endpointName} failed with HTTP ${res.status}.`);
  }

  if (!isJson) {
    const rawText = await res.text().catch(() => '');
    const trimmed = rawText.trim().toLowerCase();
    if (contentType.includes('text/html') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      throw new Error(
        `Server returned an HTML page instead of JSON for ${endpointName}. Ensure server.ts is running and serving ${endpointName}.`
      );
    }
    throw new Error(
      `Invalid response content-type from ${endpointName}: expected application/json but received "${contentType || 'unknown'}".`
    );
  }

  return res.json();
}

export default function App() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AndroidAppTab>('scan');

  const [samples, setSamples] = useState<CropSample[]>(() => getLocalizedSamples('en'));
  const [selectedSample, setSelectedSample] = useState<CropSample | null>(null);
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<CropDiagnosis | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFlutterModalOpen, setIsFlutterModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Restore saved language, contrast, and history
  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEY_LANG) as SupportedLanguage;
    if (savedLang && ['en', 'hi', 'te', 'kn', 'ta', 'gu'].includes(savedLang)) {
      setCurrentLang(savedLang);
      setSamples(getLocalizedSamples(savedLang));
    }

    const savedContrast = localStorage.getItem(STORAGE_KEY_CONTRAST);
    if (savedContrast) setHighContrast(savedContrast === 'true');

    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  const recordDiagnosisResult = (result: CropDiagnosis, imageForRecord?: string | null) => {
    setDiagnosis(result);

    const newHistoryItem: HistoryItem = {
      id: `scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      cropName: result.cropName,
      diagnosisName: result.diagnosisName,
      severityLevel: result.severityLevel,
      healthScore: result.healthScore,
      imageUrl: imageForRecord || previewImage || (selectedSample ? selectedSample.thumbnail : undefined),
      diagnosis: result
    };

    setHistory((prev) => {
      const updated = [newHistoryItem, ...prev.slice(0, 19)];
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });

    setActiveTab('diagnosis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Built-in sample cards resolve their saved local diagnosis directly without calling /api/diagnose or sending imageBase64
  const applyLocalSampleDiagnosis = (sample: CropSample, langToUse: SupportedLanguage = currentLang) => {
    setErrorMessage(null);
    const localResult: CropDiagnosis = getCleanFallbackDiagnosis(sample.id, langToUse);
    recordDiagnosisResult(localResult, sample.thumbnail);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    const localizedList = getLocalizedSamples(lang);
    setSamples(localizedList);

    // If a built-in demo sample is currently selected, update it locally without calling /api/diagnose
    if (selectedSample && !customImageBase64) {
      const updatedSample = localizedList.find(s => s.id === selectedSample.id);
      if (updatedSample) {
        setSelectedSample(updatedSample);
        const localResult: CropDiagnosis = getCleanFallbackDiagnosis(updatedSample.id, lang);
        setDiagnosis(localResult);
      }
    }
  };

  const handleToggleHighContrast = () => {
    const nextVal = !highContrast;
    setHighContrast(nextVal);
    localStorage.setItem(STORAGE_KEY_CONTRAST, String(nextVal));
  };

  const handleSelectSample = (sample: CropSample) => {
    setSelectedSample(sample);
    setCustomImageBase64(null);
    setCustomFile(null);
    setPreviewImage(sample.thumbnail);
    setErrorMessage(null);

    applyLocalSampleDiagnosis(sample, currentLang);
  };

  const handleCustomImageSelected = (base64: string, file: File) => {
    setSelectedSample(null);
    setCustomImageBase64(base64);
    setCustomFile(file);
    setPreviewImage(base64);
    setErrorMessage(null);
  };

  const executeDiagnosis = async (
    sampleId?: string, 
    base64?: string | null, 
    cropHint?: string, 
    notes?: string,
    langToUse: SupportedLanguage = currentLang
  ) => {
    setErrorMessage(null);

    const activeSampleId = sampleId || (selectedSample && !customImageBase64 && !base64 ? selectedSample.id : undefined);
    const uploadedImageBase64 = base64 || customImageBase64;

    // 1. Built-in sample cards return their saved local sample diagnosis without calling /api/diagnose or sending imageBase64
    if (activeSampleId && !uploadedImageBase64) {
      const targetSample =
        samples.find((s) => s.id === activeSampleId) ||
        selectedSample ||
        getLocalizedSamples(langToUse).find((s) => s.id === activeSampleId);
      const localResult: CropDiagnosis = getCleanFallbackDiagnosis(activeSampleId, langToUse);
      recordDiagnosisResult(localResult, targetSample?.thumbnail);
      return;
    }

    // 2. Only user-uploaded photos call POST /api/diagnose
    if (!uploadedImageBase64) {
      setErrorMessage(
        langToUse === 'gu'
          ? 'કૃપા કરીને પહેલા પાકના પાંદડાનો ફોટો પાડો અથવા અપલોડ કરો, અથવા બિલ્ટ-ઇન નમૂના કાર્ડ પર ટેપ કરો.'
          : 'Please capture or upload a crop leaf photo first, or tap a built-in sample card.'
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const payload = {
        imageBase64: uploadedImageBase64,
        mimeType: customFile ? customFile.type || 'image/jpeg' : 'image/jpeg',
        cropHint: cropHint || '',
        additionalNotes: notes || '',
        lang: langToUse
      };

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await parseJsonApiResponse<{
        success: boolean;
        diagnosis?: CropDiagnosis;
        error?: string;
      }>(res, 'POST /api/diagnose');

      if (!data.success || !data.diagnosis) {
        throw new Error(data.error || 'Failed to complete diagnosis');
      }

      recordDiagnosisResult(data.diagnosis, uploadedImageBase64);
    } catch (err: any) {
      console.error('Diagnosis error:', err);
      setErrorMessage(err.message || 'Diagnostic error occurred. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setDiagnosis(item.diagnosis);
    if (item.imageUrl) {
      setPreviewImage(item.imageUrl);
    }
    setActiveTab('diagnosis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetScan = () => {
    setDiagnosis(null);
    setSelectedSample(null);
    setCustomImageBase64(null);
    setCustomFile(null);
    setPreviewImage(null);
    setActiveTab('scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCropFromGuide = (_cropName: string) => {
    setActiveTab('scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const t = TRANSLATIONS[currentLang];

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      highContrast 
        ? 'bg-[#001710] text-white' 
        : 'bg-[#f4fbf4] text-[#161d19]'
    }`}>
      {/* Android Top App Bar with live real-time field weather ticker */}
      <AndroidTopBar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        highContrast={highContrast}
        onToggleHighContrast={handleToggleHighContrast}
        onOpenFlutterExport={() => setIsFlutterModalOpen(true)}
        onOpenAiSetup={() => setIsAiModalOpen(true)}
      />

      {/* Main Multi-Paged View Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-extrabold underline"
            >
              {t.dismiss}
            </button>
          </div>
        )}

        {/* Tab Page 1: SCAN */}
        {activeTab === 'scan' && (
          <ScannerHero
            currentLang={currentLang}
            highContrast={highContrast}
            samples={samples}
            selectedSample={selectedSample}
            onSelectSample={handleSelectSample}
            onCustomImageSelected={handleCustomImageSelected}
            onStartDiagnosis={(cropHint, notes) => executeDiagnosis(undefined, customImageBase64, cropHint, notes, currentLang)}
            isAnalyzing={isAnalyzing}
            previewImage={previewImage}
          />
        )}

        {/* Tab Page 2: DIAGNOSIS & PRESCRIPTION */}
        {activeTab === 'diagnosis' && (
          diagnosis ? (
            <DiagnosisResult
              diagnosis={diagnosis}
              imageUrl={previewImage}
              currentLang={currentLang}
              highContrast={highContrast}
              onReset={handleResetScan}
              onOpenDosageCalculator={() => setActiveTab('calculator')}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[#c0c9c3] p-10 text-center max-w-md mx-auto shadow-sm my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#e8f0e9] text-[#1b6d24] flex items-center justify-center mx-auto mb-3">
                <Scan className="w-7 h-7" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#161d19] mb-1">
                {t.noActiveDiagnosis}
              </h3>
              <p className="text-xs text-[#707974] mb-6">
                {t.noActiveDiagnosisDesc}
              </p>
              <button
                onClick={() => setActiveTab('scan')}
                className="w-full py-3 px-5 rounded-xl bg-[#003629] text-white font-display text-xs font-bold hover:bg-[#1b4d3e] flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <Scan className="w-4 h-4 text-[#a0f399]" />
                {t.goToScanner}
              </button>
            </div>
          )
        )}

        {/* Tab Page 3: SPRAYER TANK & DOSAGE CALCULATOR */}
        {activeTab === 'calculator' && (
          <CalculatorPage currentLang={currentLang} />
        )}

        {/* Tab Page 4: INDIAN CROP DISEASE GUIDE */}
        {activeTab === 'guide' && (
          <CropGuidePage
            currentLang={currentLang}
            onSelectCropForScan={handleSelectCropFromGuide}
          />
        )}

        {/* Tab Page 5: FIELD SCAN HISTORY */}
        {activeTab === 'history' && (
          <HistoryPage
            history={history}
            onSelectHistory={handleSelectHistoryItem}
            onClearHistory={handleClearHistory}
            currentLang={currentLang}
            onStartNewScan={() => setActiveTab('scan')}
          />
        )}
      </main>

      {/* Android Bottom Navigation Bar */}
      <AndroidNavBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentLang={currentLang}
        hasDiagnosis={!!diagnosis}
        historyCount={history.length}
      />

      {/* Flutter Source Code Export Modal */}
      <FlutterExportModal
        isOpen={isFlutterModalOpen}
        onClose={() => setIsFlutterModalOpen(false)}
        currentLang={currentLang}
      />

      {/* Gemini AI Vision Engine & Setup Guide Modal */}
      <AiEngineModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentLang={currentLang}
      />
    </div>
  );
}
