import { useCorrespondenceStore } from '../store';
import { CATEGORY_TABS, STATUS_CONFIG, PRIORITY_CONFIG, CLASSIFICATION_CONFIG } from '../constants';
import { Search, Star, Clock, FileText, Inbox, Send, FileEdit, Archive, List } from 'lucide-react';
import { useLetterSearch } from '../hooks';
import type { Letter } from '../types';

const iconMap: Record<string, React.ElementType> = { Inbox, Send, FileEdit, Clock, Archive, List };

interface LetterListProps {
  onSelect: (letter: Letter) => void;
  onCompose: () => void;
}

export function LetterList({ onSelect }: LetterListProps) {
  const { activeCategory, setCategory, toggleStarred, filteredLetters } = useCorrespondenceStore();
  const { query, search } = useLetterSearch();
  const letters = filteredLetters();

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex items-center gap-0.5 p-2 border-b border-border overflow-x-auto">
        {CATEGORY_TABS.map(tab => {
          const Icon = iconMap[tab.icon] || FileText;
          const isActive = activeCategory === tab.id;
          return (
            <button key={tab.id} onClick={() => setCategory(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${isActive ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <Icon className="w-3.5 h-3.5" /><span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input dir="rtl" value={query} onChange={e => search(e.target.value)} placeholder="جستجوی نامه..."
            className="w-full bg-secondary border border-border rounded-lg py-2 pr-9 pl-3 text-xs text-foreground focus:outline-none focus:border-accent" />
        </div>
      </div>

      {/* Letter List */}
      <div className="flex-1 overflow-y-auto">
        {letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">نامه‌ای یافت نشد</p>
          </div>
        ) : letters.map(letter => (
          <button key={letter.id} onClick={() => onSelect(letter)}
            className={`w-full text-right p-3 border-b border-border/50 hover:bg-secondary/30 transition-colors ${letter.unread ? 'bg-accent/5' : ''}`}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CONFIG[letter.status]?.bg} ${STATUS_CONFIG[letter.status]?.color}`}>
                    {STATUS_CONFIG[letter.status]?.fa}
                  </span>
                  {letter.classification !== 'unclassified' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CLASSIFICATION_CONFIG[letter.classification]?.bg} ${CLASSIFICATION_CONFIG[letter.classification]?.color}`}>
                      {CLASSIFICATION_CONFIG[letter.classification]?.fa}
                    </span>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[letter.priority]?.dot}`} />
                </div>
                <p className={`text-sm font-medium truncate ${letter.unread ? 'text-foreground' : 'text-foreground/80'}`}>{letter.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{letter.sender}</span>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{letter.registryNumber}</span>
                  {letter.responseDeadline && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />سررسید</span>
                  )}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); toggleStarred(letter.id); }}
                className="p-1 flex-shrink-0">
                <Star className={`w-3.5 h-3.5 ${letter.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
