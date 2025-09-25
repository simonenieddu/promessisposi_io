import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Calendar, Sparkles } from "lucide-react";
import Header from "@/components/header";

interface GlossaryTerm {
  id: number;
  word: string;
  definition: string;
  etymology?: string;
  category: string;
  chapter?: number;
}

// Dati del glossario con termini dai Promessi Sposi
const glossaryData: GlossaryTerm[] = [
  {
    id: 1,
    word: "Bravi",
    definition: "Soldati di ventura al servizio di signori potenti, spesso dediti a soprusi e violenze. Nel romanzo rappresentano il braccio armato dell'oppressione feudale.",
    etymology: "Dal termine spagnolo 'bravo', che indicava un soldato coraggioso ma spesso senza scrupoli.",
    category: "Società",
    chapter: 1
  },
  {
    id: 2,
    word: "Podestà",
    definition: "Magistrato civile con funzioni amministrative e giudiziarie, nominato dal governo centrale per amministrare i comuni.",
    category: "Istituzioni",
    chapter: 2
  },
  {
    id: 3,
    word: "Monatto",
    definition: "Persona addetta alla raccolta e sepoltura dei morti durante le epidemie di peste. Figura tragica ma necessaria durante la pestilenza del 1630.",
    category: "Medicina",
    chapter: 31
  },
  {
    id: 4,
    word: "Lazzaretto",
    definition: "Ospedale per malati contagiosi, in particolare appestati. Il Lazzaretto di Milano fu cruciale durante l'epidemia descritta nel romanzo.",
    etymology: "Dal nome di San Lazzaro, protettore dei lebbrosi.",
    category: "Medicina",
    chapter: 35
  },
  {
    id: 5,
    word: "Osteria",
    definition: "Locanda dove si servivano vino e cibi semplici, spesso frequentata dal popolo minuto. Luogo di incontri e discussioni popolari.",
    category: "Vita quotidiana",
    chapter: 8
  },
  {
    id: 6,
    word: "Feudatario",
    definition: "Nobile che possedeva terre e privilegi concessi dal sovrano in cambio di servizi militari. Rappresenta il potere aristocratico dell'epoca.",
    category: "Società",
    chapter: 19
  },
  {
    id: 7,
    word: "Cancelliere",
    definition: "Funzionario che redigeva e custodiva gli atti pubblici, spesso personaggio influente nell'amministrazione locale.",
    category: "Istituzioni",
    chapter: 3
  },
  {
    id: 8,
    word: "Convento",
    definition: "Comunità religiosa dove vivevano monaci o monache secondo una regola. Nel romanzo, luogo di rifugio ma anche di conflitti interiori.",
    category: "Religione",
    chapter: 9
  },
  {
    id: 9,
    word: "Grida",
    definition: "Editti o proclami del governo spagnolo che venivano affissi pubblicamente. Spesso inefficaci nella realtà dei fatti.",
    etymology: "Dal verbo 'gridare', perché venivano proclamate ad alta voce.",
    category: "Istituzioni",
    chapter: 1
  },
  {
    id: 10,
    word: "Borghesia",
    definition: "Classe sociale intermedia tra aristocrazia e popolo, composta da mercanti, artigiani agiati e professionisti.",
    category: "Società",
    chapter: 10
  },
  {
    id: 11,
    word: "Contado",
    definition: "Territorio rurale sotto la giurisdizione di una città, abitato principalmente da contadini e piccoli proprietari.",
    category: "Geografia",
    chapter: 4
  },
  {
    id: 12,
    word: "Ducato",
    definition: "Moneta d'argento usata negli stati italiani. Rappresenta anche il territorio governato da un duca.",
    category: "Economia",
    chapter: 12
  },
  {
    id: 13,
    word: "Ergastolo",
    definition: "Prigione per lavori forzati, spesso situata in fortezze o castelli. Punizione severa per crimini gravi.",
    category: "Giustizia",
    chapter: 20
  },
  {
    id: 14,
    word: "Forestiero",
    definition: "Straniero, persona proveniente da altro paese o regione. Nel romanzo spesso visto con sospetto dalla popolazione locale.",
    category: "Società",
    chapter: 15
  },
  {
    id: 15,
    word: "Giovinotto",
    definition: "Giovane uomo, termine usato con sfumatura affettuosa o ironica. Renzo viene spesso definito così.",
    category: "Vita quotidiana",
    chapter: 2
  }
];

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function Glossary() {
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [wordOfTheDay, setWordOfTheDay] = useState<GlossaryTerm | null>(null);

  // Seleziona la parola del giorno
  useEffect(() => {
    const today = new Date().toDateString();
    const savedWordOfTheDay = localStorage.getItem('wordOfTheDay');
    const savedDate = localStorage.getItem('wordOfTheDayDate');
    
    if (savedDate !== today || !savedWordOfTheDay) {
      // Genera una nuova parola del giorno
      const randomIndex = Math.floor(Math.random() * glossaryData.length);
      const newWordOfTheDay = glossaryData[randomIndex];
      
      setWordOfTheDay(newWordOfTheDay);
      localStorage.setItem('wordOfTheDay', JSON.stringify(newWordOfTheDay));
      localStorage.setItem('wordOfTheDayDate', today);
    } else {
      setWordOfTheDay(JSON.parse(savedWordOfTheDay));
    }
  }, []);

  // Filtra i termini per lettera o ricerca
  const filteredTerms = glossaryData.filter(term => {
    const matchesSearch = searchTerm === '' || 
      term.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLetter = searchTerm === '' ? 
      term.word.charAt(0).toUpperCase() === selectedLetter : true;
    
    return matchesSearch && matchesLetter;
  });

  // Ottieni le lettere disponibili
  const availableLetters = alphabet.filter(letter => 
    glossaryData.some(term => term.word.charAt(0).toUpperCase() === letter)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-avenir font-bold text-literary-blue mb-4">
            Glossario dei Promessi Sposi
          </h1>
          <p className="text-lg text-warm-gray max-w-2xl mx-auto">
            Esplora i termini, le espressioni e i concetti del mondo manzoniano per comprendere meglio il capolavoro della letteratura italiana
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Colonna sinistra - Navigazione e ricerca */}
          <div className="lg:col-span-1 space-y-6">
            {/* Ricerca */}
            <div className="modern-card p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-warm-gray/50" />
                <Input
                  placeholder="Cerca nel glossario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Alfabeto */}
            <div className="modern-card p-6">
              <h3 className="font-avenir font-semibold text-literary-blue mb-4">
                Naviga per lettera
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {alphabet.map((letter) => (
                  <Button
                    key={letter}
                    variant={selectedLetter === letter ? "default" : "outline"}
                    size="sm"
                    className={`${
                      selectedLetter === letter 
                        ? 'bg-literary-blue text-white' 
                        : availableLetters.includes(letter)
                          ? 'text-literary-blue border-literary-blue hover:bg-literary-blue hover:text-white'
                          : 'text-gray-300 border-gray-200 cursor-not-allowed'
                    }`}
                    disabled={!availableLetters.includes(letter)}
                    onClick={() => {
                      setSelectedLetter(letter);
                      setSearchTerm('');
                    }}
                  >
                    {letter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Parola del giorno */}
            {wordOfTheDay && (
              <div className="modern-card p-6 bg-gradient-to-br from-literary-blue/5 to-purple-600/5 border-literary-blue/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-literary-blue" />
                  <h3 className="font-avenir font-semibold text-literary-blue">
                    Parola del giorno
                  </h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedTerm(wordOfTheDay)}
                    className="text-lg font-semibold text-literary-blue hover:underline cursor-pointer"
                  >
                    {wordOfTheDay.word}
                  </button>
                  <p className="text-sm text-warm-gray line-clamp-3">
                    {wordOfTheDay.definition}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span className="text-warm-gray/70">
                      {new Date().toLocaleDateString('it-IT', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonna centrale - Lista termini */}
          <div className="lg:col-span-2 space-y-4">
            <div className="modern-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="h-5 w-5 text-literary-blue" />
                <h2 className="text-xl font-avenir font-semibold text-literary-blue">
                  {searchTerm ? `Risultati per "${searchTerm}"` : `Lettera ${selectedLetter}`}
                </h2>
                <Badge variant="secondary" className="text-literary-blue">
                  {filteredTerms.length} {filteredTerms.length === 1 ? 'termine' : 'termini'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {filteredTerms.map((term) => (
                  <div
                    key={term.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-literary-blue hover:bg-literary-blue/5 cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedTerm(term)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-literary-blue hover:underline">
                        {term.word}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {term.category}
                        </Badge>
                        {term.chapter && (
                          <Badge variant="secondary" className="text-xs">
                            Cap. {term.chapter}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-warm-gray line-clamp-2">
                      {term.definition}
                    </p>
                  </div>
                ))}
                
                {filteredTerms.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-warm-gray">
                      Nessun termine trovato {searchTerm && `per "${searchTerm}"`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonna destra - Definizione selezionata */}
          <div className="lg:col-span-1">
            {selectedTerm ? (
              <div className="modern-card p-6 sticky top-24">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-avenir font-bold text-literary-blue mb-2">
                      {selectedTerm.word}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-literary-blue text-white">
                        {selectedTerm.category}
                      </Badge>
                      {selectedTerm.chapter && (
                        <Badge variant="secondary">
                          Capitolo {selectedTerm.chapter}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-warm-gray mb-2">Definizione</h4>
                    <p className="text-warm-gray leading-relaxed">
                      {selectedTerm.definition}
                    </p>
                  </div>
                  
                  {selectedTerm.etymology && (
                    <div>
                      <h4 className="font-semibold text-warm-gray mb-2">Etimologia</h4>
                      <p className="text-sm text-warm-gray/80 italic">
                        {selectedTerm.etymology}
                      </p>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTerm(null)}
                    className="w-full mt-4"
                  >
                    Chiudi dettagli
                  </Button>
                </div>
              </div>
            ) : (
              <div className="modern-card p-6">
                <div className="text-center text-warm-gray">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Seleziona un termine per vederne la definizione completa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}