import { useState } from "react";
import { LetterV2 } from "@/entities/letter";
import { useCorrespondenceStore } from "@/modules/correspondence/store";
import { LetterList } from "./components/LetterList";
import { LetterDetail } from "./components/LetterDetail";
import { ComposeWizard } from "./components/ComposeWizard";
import { RegistryBook } from "./components/RegistryBook";
import { Statistics } from "./components/Statistics";
import { ArchiveManager } from "@/modules/correspondence/components/ArchiveManager";

type View = "list" | "detail" | "compose" | "registry" | "stats" | "archive";

function CorrespondencePortal() {
  const [view, setView] = useState<View>("list");
  const [activeCategory, setActiveCategory] = useState("inbox");
  const [selectedLetter, setSelectedLetter] = useState<LetterV2 | null>(null);

  // Store letters converted to LetterV2 shape for display
  const storeLetters = useCorrespondenceStore((s) => s.letters);

  const handleSelectLetter = (letter: LetterV2) => {
    setSelectedLetter(letter);
    setView("detail");
  };

  const handleBack = () => {
    setSelectedLetter(null);
    setView("list");
  };

  return (
    <div className="h-full" dir="rtl">
      {view === "list" && (
        <LetterList
          onSelect={handleSelectLetter}
          onCompose={() => setView("compose")}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onShowRegistry={() => setView("registry")}
          onShowStats={() => setView("stats")}
          onShowArchive={() => setView("archive")}
          storeLetters={storeLetters}
        />
      )}
      {view === "detail" && selectedLetter && (
        <LetterDetail letter={selectedLetter} onBack={handleBack} />
      )}
      {view === "compose" && (
        <ComposeWizard onBack={handleBack} onSubmit={handleBack} />
      )}
      {view === "registry" && (
        <RegistryBook onBack={handleBack} onSelectLetter={handleSelectLetter} />
      )}
      {view === "stats" && (
        <Statistics onBack={handleBack} />
      )}
      {view === "archive" && (
        <div className="h-full flex flex-col" dir="rtl">
          <div className="border-b border-border px-4 py-2 flex items-center gap-3 flex-shrink-0 bg-white">
            <button
              onClick={handleBack}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← بازگشت
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ArchiveManager />
          </div>
        </div>
      )}
    </div>
  );
}

export default CorrespondencePortal;
