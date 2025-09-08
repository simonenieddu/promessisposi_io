import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import { 
  BookOpen, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Trophy,
  Target,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Chapter {
  id: number;
  number: number;
  title: string;
  content: string;
  summary: string;
}

interface UserProgress {
  chapterId: number;
  isCompleted: boolean;
  readingProgress: number;
  currentPage: number;
  timeSpent: number;
  bookmarkPage?: number;
}

const CHARS_PER_PAGE = 2500; // Circa 400-500 parole per pagina (più pagine, meno tagli)

interface Quiz {
  id: number;
  chapterId: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}

// Componente Quiz Section
function QuizSection({ chapterId, onComplete }: { chapterId: number; onComplete: () => void }) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const navigate = useLocation()[1];

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery<Quiz[]>({
    queryKey: [`/api/quizzes/chapter/${chapterId}`],
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({ answers, score }: { answers: number[], score: number }) => {
      await apiRequest('POST', `/api/users/1/quiz`, {
        chapterId,
        answers,
        score,
        totalQuestions: quizzes.length || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/1/progress'] });
    }
  });

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuizIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleAnswerSubmit = () => {
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setShowExplanation(false);
    } else {
      // Calcola il punteggio
      let totalScore = 0;
      selectedAnswers.forEach((answer: number, index: number) => {
        if (answer === quizzes[index]?.correctAnswer) {
          totalScore += quizzes[index]?.points || 0;
        }
      });
      setScore(totalScore);
      setShowResults(true);
      
      // Invia risultati al server
      submitQuizMutation.mutate({
        answers: selectedAnswers,
        score: totalScore
      });
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setShowExplanation(false);
    setScore(0);
  };

  if (quizzesLoading) {
    return (
      <Card className="modern-card mt-8">
        <CardContent className="py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-warm-gray">Caricamento quiz...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <Card className="modern-card mt-8">
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 text-amber-600 mx-auto mb-4" />
          <p className="text-warm-gray mb-4">
            Quiz non disponibile per questo capitolo
          </p>
          <Button onClick={() => navigate("/chapters")} className="bg-amber-700 hover:bg-amber-800">
            Torna ai Capitoli
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const maxScore = quizzes.reduce((sum, quiz) => sum + quiz.points, 0);
    const percentage = Math.round((score / maxScore) * 100);
    
    return (
      <Card className="modern-card mt-8">
        <CardHeader>
          <CardTitle className="text-amber-700 flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Risultati Quiz - Capitolo {chapterId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-amber-700">{percentage}%</div>
              <p className="text-lg text-warm-gray">
                {score} / {maxScore} punti
              </p>
              <Progress value={percentage} className="w-full h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-green-700 font-semibold">Risposte Corrette</div>
                <div className="text-2xl font-bold text-green-600">
                  {selectedAnswers.filter((answer, index) => answer === quizzes[index].correctAnswer).length}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-red-700 font-semibold">Risposte Sbagliate</div>
                <div className="text-2xl font-bold text-red-600">
                  {selectedAnswers.filter((answer, index) => answer !== quizzes[index].correctAnswer).length}
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="text-amber-700 font-semibold">Totale Domande</div>
                <div className="text-2xl font-bold text-amber-600">{quizzes.length}</div>
              </div>
            </div>

            <div className="space-y-4">
              {percentage >= 80 ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-green-700 font-semibold">🎉 Eccellente!</p>
                  <p className="text-green-600 text-sm">Hai dimostrato una ottima comprensione del capitolo.</p>
                </div>
              ) : percentage >= 60 ? (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-yellow-700 font-semibold">👍 Buon lavoro!</p>
                  <p className="text-yellow-600 text-sm">Hai una buona comprensione. Rileggi alcune parti per migliorare.</p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-red-700 font-semibold">📚 Continua a studiare</p>
                  <p className="text-red-600 text-sm">Rileggi il capitolo e riprova il quiz per consolidare la comprensione.</p>
                </div>
              )}
            </div>

            {/* Riassunto dettagliato delle risposte */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-warm-gray">Riassunto delle Risposte</h4>
              <div className="space-y-3">
                {quizzes.map((quiz, index) => {
                  const userAnswer = selectedAnswers[index];
                  const isCorrect = userAnswer === quiz.correctAnswer;
                  
                  return (
                    <div 
                      key={quiz.id} 
                      className={`p-4 rounded-lg border ${
                        isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <p className="font-medium text-sm text-warm-gray">
                          {index + 1}. {quiz.question}
                        </p>
                        
                        <div className="flex items-center gap-2 text-sm">
                          {isCorrect ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-700">
                                Corretta: {String.fromCharCode(65 + userAnswer)}) {quiz.options[userAnswer]}
                              </span>
                              <span className="text-green-600 text-xs">+{quiz.points} punti</span>
                            </>
                          ) : (
                            <>
                              <span className="text-red-600 font-bold">✗</span>
                              <div className="flex flex-col gap-1">
                                <span className="text-red-700">
                                  Tua risposta: {String.fromCharCode(65 + userAnswer)}) {quiz.options[userAnswer]}
                                </span>
                                <span className="text-green-700">
                                  Corretta: {String.fromCharCode(65 + quiz.correctAnswer)}) {quiz.options[quiz.correctAnswer]}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {!isCorrect && (
                          <div className="bg-white/70 p-3 rounded border mt-2">
                            <p className="text-xs text-warm-gray leading-relaxed">{quiz.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={handleRetakeQuiz} variant="outline" className="text-amber-700 border-amber-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rifai Quiz
              </Button>
              <Button onClick={() => navigate(`/chapters/${chapterId + 1}`)} variant="outline">
                Prossimo Capitolo
              </Button>
              <Button onClick={() => navigate("/chapters")} className="bg-amber-700 hover:bg-amber-800">
                Torna ai Capitoli
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuiz = quizzes[currentQuizIndex];
  const progress = ((currentQuizIndex + 1) / quizzes.length) * 100;

  return (
    <Card className="modern-card mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-700">
            Quiz di Comprensione - Capitolo {chapterId}
          </CardTitle>
          <Badge variant="outline" className="text-amber-700 border-amber-700">
            {currentQuizIndex + 1} / {quizzes.length}
          </Badge>
        </div>
        <Progress value={progress} className="w-full h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-warm-gray leading-relaxed">
            {currentQuiz.question}
          </h3>
          
          <div className="space-y-3">
            {currentQuiz.options.map((option, index) => {
              const isSelected = selectedAnswers[currentQuizIndex] === index;
              const isCorrect = index === currentQuiz.correctAnswer;
              const showAnswer = showExplanation;
              
              let buttonClass = '';
              let badgeClass = '';
              let iconElement = null;

              if (showAnswer) {
                if (isCorrect) {
                  buttonClass = 'border-green-500 bg-green-50 text-green-800';
                  badgeClass = 'bg-green-500 text-white';
                  iconElement = <CheckCircle className="h-4 w-4" />;
                } else if (isSelected && !isCorrect) {
                  buttonClass = 'border-red-500 bg-red-50 text-red-800';
                  badgeClass = 'bg-red-500 text-white';
                  iconElement = <span className="text-red-500">✗</span>;
                } else {
                  buttonClass = 'border-warm-gray/20 bg-warm-gray/5 text-warm-gray';
                  badgeClass = 'bg-warm-gray/20 text-warm-gray';
                }
              } else {
                if (isSelected) {
                  buttonClass = 'border-amber-600 bg-amber-50 text-amber-800';
                  badgeClass = 'bg-amber-600 text-white';
                } else {
                  buttonClass = 'border-warm-gray/20 hover:border-amber-400 hover:bg-amber-50/50';
                  badgeClass = 'bg-warm-gray/20 text-warm-gray';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => !showAnswer && handleAnswerSelect(index)}
                  disabled={showAnswer}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${buttonClass} ${showAnswer ? 'cursor-default' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${badgeClass}`}>
                      {showAnswer && iconElement ? iconElement : String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spiegazione dopo aver risposto */}
        {showExplanation && (
          <div className={`p-4 rounded-lg border ${
            selectedAnswers[currentQuizIndex] === currentQuiz.correctAnswer
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              {selectedAnswers[currentQuizIndex] === currentQuiz.correctAnswer ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-700">Risposta Corretta! 🎉</p>
                    <p className="text-sm text-green-600">Hai guadagnato {currentQuiz.points} punti</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-red-600 text-lg font-bold mt-0.5">✗</span>
                  <div>
                    <p className="font-semibold text-red-700">Risposta Sbagliata</p>
                    <p className="text-sm text-red-600">
                      La risposta corretta era: <strong>{String.fromCharCode(65 + currentQuiz.correctAnswer)}) {currentQuiz.options[currentQuiz.correctAnswer]}</strong>
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-white/70 p-3 rounded border">
              <p className="text-sm font-medium text-warm-gray mb-1">Spiegazione:</p>
              <p className="text-sm text-warm-gray leading-relaxed">{currentQuiz.explanation}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-warm-gray">
            Punti: {currentQuiz.points}
          </div>
          
          {!showExplanation ? (
            <Button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswers[currentQuizIndex] === undefined}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              Conferma Risposta
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              {currentQuizIndex < quizzes.length - 1 ? 'Prossima Domanda' : 'Completa Quiz'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Esempio di testo del Capitolo 1 (più pagine per testare la navigazione)
const CHAPTER_CONTENT = `Quel ramo del lago di Como, che volge a mezzogiorno, tra due catene non interrotte di monti, tutto a seni e a golfi, a seconda dello sporgere e del rientrare di quelli, vien, quasi a un tratto, a ristringersi, e a prender corso e figura di fiume, tra un promontorio a destra, e un'ampia costiera dall'altra parte; e il ponte, che ivi congiunge le due rive, par che renda ancor più sensibile all'occhio questa trasformazione, e segni il punto dove il lago cessa, e l'Adda rincomincia, per riprendere poi nome di lago dove le rive, allontanandosi di nuovo, lascian l'acqua distendersi e rallentarsi in nuovi golfi e in nuovi seni.

La costiera, formata dal deposito di tre grossi torrenti, scende appoggiata a due monti contigui, l'uno detto di san Martino, l'altro, con voce lombarda, il Resegone, dai molti suoi cocuzzoli in fila, che in vero lo fanno somigliare a una sega: talché non è chi, al primo vederlo, purché sia di fronte, come per esempio di su le mura di Milano che guardano a settentrione, non lo riconosca tosto, a un tal contrassegno, tra le altre montagne di nome più oscuro e di forma più comune.

Per una di queste stradicciole, tornava bel bello dalla passeggiata verso casa, nella sera del giorno 7 novembre dell'anno 1628, don Abbondio, curato di uno di que' villaggi soprannominati: passeggiata solitaria e tranquilla, secondo il suo costume, e secondo la consuetudine di que' tempi, ancor più che secondo il bisogno del proprio temperamento.

Don Abbondio (il lettore se n'è già avveduto) non era nato con un cuor di leone. Ma, in que' tempi turbolenti, una natura timida aveva molte più occasioni, che non abbia a' dì nostri, di sentire la propria debolezza, e di trovarsi a dover prendere risoluzioni diverse da quelle che avrebbe scelte l'inclinazione.

La mancanza di una forza pubblica, la licenza de' grandi, l'impunità, che n'eran le conseguenze, dovevano naturalmente produrre, e mantenere in vigore, una dottrina e un'abitudine diametralmente contrarie: che ciascheduno si facesse ragione da sé, fosse ragione o fosse torto.

La strada faceva un piccolo gomito, e don Abbondio, girando, vide quello che non avrebbe voluto vedere, quello che non aveva preveduto mai, ne' suoi timori: vide a certo tratto, nella strada dritta dinanzi a lui, due uomini fermi, l'uno di faccia all'altro, come se stessero in conversazione.

L'uno di costoro aveva una carabina a tracolla, l'altro una schioppo; ma quello che maggiormente colpì don Abbondio, fu il veder che ambedue, come del resto era costume, portavan grandi cappellacci, che nascondevan le ciglia, e in que' cappellacci un nastro, insegna, a que' tempi, di braveria, e come tale proibita dalle gride.

Eran due di que' tali che si chiaman bravi. Questa specie d'uomini, ora estinta, non è però così antica che ognuno non possa averne sentito parlare; e quelli che non ne abbiano sentito parlare, potranno andarsene con soddisfazione nell'altro mondo, quando che sia, senz'aver perduto nulla.

Per dare un'idea di questa gente, basterà metter qui alcuni squarci di gride pubblicate in que' tempi da' suoi padroni, cioè da coloro che avevano diritto di comandarle, per aver ottenuto dal re cattolico il dominio di Milano: gride che si conservano tuttavia negli archivj, e si posson vedere stampate nella Raccolta delle leggi e decreti pubblicata per ordine della real corte.

Nella grida del 23 maggio 1583, il governatore don Martino de Leyva, "volendo provvedere alli disordini de' bravi", proibisce "a qualsivoglia persona, di che stato, grado o condition si sia, l'andar di notte tempo con armi... sotto pena, a' trasgressori che saranno stati della persona del conte di Lecco, di tre squarci di corda, e di quattro anni di galera".

Nella grida del 12 aprile 1595, don Pedro Henrriquez de Acevedo, conte di Fuentes, capitano e governatore dello stato di Milano, "volendo, mediante severe dimostrazioni di giustizia, reprimere le violenze e l'insolenze che si commettono per la città e stato da molti, che confidandosi nell'aiuto e favore che gli prestano alcuni signori e gentil'uomini, non hanno timore di trasgredire", ordina che "nessuna persona ardisca tener presso di sé huomini di mal affare".

Il che ci fa conoscere che, prima di quella grida, era proibito a' gentiluomini di tener bravi; e che, malgrado la proibizione, ne tenevano. Lo stesso si deve dire d'un'altra grida del medesimo governatore, del 5 dicembre 1593, nella quale, "considerando che molti, per l'impunità del delinquere, si son dati alla profession del bravo", comanda che qualunque persona "che sarà convinta aver fatto profession di bravo... sia, per questa sola colpa, condannata alle galere, per tempo di tre anni".

E qui, degna di particolare osservazione, è una grida del 13 febbraio 1594, nella quale, dopo aver rinnovate le solite proibizioni, e minacciate le solite pene, il governatore si lagna che una mano di persone facinorose e audaci non si atterrivano per questo, e che anzi qualcuna di esse si era mossa a commettere eccessi maggiori. Per rimedio del che, egli ordina a tutti gli uffiziali di giustizia, e fa sapere a tutti gli altri, che contro simili persone si procederà risolutamente, "senza aver rispetto a personaggio alcuno". Parole notabili davvero, e che fanno intendere chiaramente che il mal era di que' personaggi.

Ma la grida più notabile è quella del 23 maggio 1598, nella quale si legge: "Essendoci stato esposto che in questa città e stato si trovano molte persone che vanno vagando di qua e di là, armati di archibugi, schioppi e di altre sorte d'armi, parte de' quali sono banditi per diverse cause, parte sono persone di mal affare e di pessima vita e fama, parte sicari che stanno aspettando di commettere qualche homicidio ad istanza di chi li compra per questo effetto, parte altri malfattori di diverse qualità, li quali, confidandosi nelle aderenze e favori di alcuni cavalieri e gentiluomini, non solamente non si astengono dal commettere nuove sceleratezze, ma vanno attorno minacciando di fare delle offese, e tal volta l'eseguiscono"...

E dopo una lunga enumerazione di disordini e di delitti, termina: "comandiamo a tutti li detti cavalieri, gentiluomini e altre persone di qual si voglia stato e condizione, che per l'avenire non ardischino tenere al loro servigio, né dar ricetto in casa, né favor alcuno a simili persone". Ed ecco subito il premio promesso a chi contravvenga a quest'ordine: "multa di mille scudi d'oro applicata alla regia camera, ed altre pene ad arbitrio nostro, secondo la qualità de' casi e delle persone".

È ben naturale che il lettore sia ora curioso di sapere chi fossero questi gran personaggi che potevano così dar la corda al governatore spagnolo, costringerlo a que' lamenti, a quelle confessioni, a que' giri di parole. Dirlo però non è tanto facile: le gride non li nominano espressamente; e, per saperne i nomi, bisogna frugare nelle memorie di quel tempo.

Don Gonzalo Fernandez de Cordova, che, nel 1596, succedette a don Pedro nel governo di Milano, informato meglio del carattere de' suoi amministrati, pensò di provvedere con un rimedio più efficace e più spiccio. Da una relazione inedita di que' tempi, sentiamo che questo governatore, "visto ch'era cosa vana il metter gride sopra gride, quando non erano osservate da chi poteva farle osservare, e che giova il proibir l'effetto quando si lascia sussistere la causa, prese la risoluzione di castigare direttamente i capi, senza badare a' titoli e alle aderenze".

E in fatti, appena arrivato, fece pubblicare un bando, col quale concedeva il perdono a tutti i banditi che si fossero presentati entro un certo termine, per sottomettersi, e prender partito ne' presidii dello Stato; proibendo, sotto gravi pene, che alcuno ardisse di accogliere coloro che non avessero profittato di questa grazia. Poiché il male aveva una radice sì antica e sì profonda, ogni rimedio non poteva essere che lento: ma pure questo d'un governatore risoluto, e che si piccava di serietà, produsse qualche effetto.

Ma su tutto il lago, e specialmente sulla riva destra, il tempo era bello: e in uno de' paesi che vedevan più chiari e più vicini, passeggiava, sulla sera del giorno 7 novembre dell'anno 1628, don Abbondio, curato del paese. Diceva tranquillamente il suo ufizio, e talvolta, tra un salmo e l'altro, chiudeva il breviario, tenendovi dentro, per segno, l'indice della mano destra, e, messa poi questa mano nel seno, andava mirando i monti, e il cielo, e i raggi del sole che, passando tra le cime de' monti, si dipingevano qua e là sui pendii e sulle falde di quelli, di un colore che andava digradando, di momento in momento, dal dorato al rossiccio.

Don Abbondio (il lettore se n'è già avveduto) non era nato con un cuor di leone. Ma, fin da' primi anni, aveva dovuto accorgersi che la peggior condizione, a que' tempi, era quella d'un animale senza artigli e senza zanne, che pure non si sentisse inclinazione d'esser divorato. La forza legale non era guardata che per la difesa di chi se ne sapesse o se ne potesse servire; e non già come una cosa destinata a proteggere l'inerme e l'ignorante. Se questo poi era un povero prete, si può bene immaginare quanto poco contasse.

Don Abbondio, non nobile, non ricco, coraggioso ancor meno, s'era dunque accorto, prima quasi di toccar gli anni della discrezione, d'essere, in quella società, come un vaso di terra cotta, costretto a viaggiare in compagnia di molti vasi di ferro. Aveva quindi, con gran cura, studiato i modi di passare inosservato, di non dar negli occhi, come si dice volgarmente. Il suo sistema consisteva principalmente nel troncare sul nascere i contrasti, cedendo a chi avesse mostrato di voler sostenere le sue ragioni con sistemi più risoluti del sillogismo.`;

// Aggiorno anche i contesti storici per le nuove pagine
const HISTORICAL_CONTEXTS = [
  {
    id: 1,
    title: "Il Lago di Como nel Seicento",
    content: "Il paesaggio descritto da Manzoni corrisponde fedelmente alla realtà geografica del lago di Como. Nel XVII secolo, questa zona era caratterizzata da piccoli borghi di pescatori e contadini, sotto il dominio spagnolo. La descrizione del Resegone è particolarmente accurata: questa montagna è tuttora riconoscibile dal profilo 'dentellato' che ricorda una sega.",
    category: "Geografia",
    pageNumber: 0
  },
  {
    id: 2,
    title: "I Bravi nella Milano Spagnola",
    content: "I bravi erano soldati di ventura al servizio dei signori locali. Durante il dominio spagnolo (1535-1706), rappresentavano un vero flagello sociale. Le gride erano i decreti governativi che tentavano inutilmente di reprimere questi fenomeni di violenza privata. Manzoni cita documenti storici reali per dimostrare l'inefficacia delle leggi.",
    category: "Storia",
    pageNumber: 1
  },
  {
    id: 3,
    title: "Le Gride Spagnole",
    content: "Le gride erano editti pubblici del governo spagnolo, affissi nelle piazze e letti ad alta voce dai banditori. Manzoni ne cita alcune autentiche per dimostrare come, nonostante le severe pene minacciate (galera, multa di mille scudi d'oro), l'autorità spagnola fosse impotente contro la prepotenza dei signori locali che proteggevano i malfattori.",
    category: "Diritto",
    pageNumber: 2
  },
  {
    id: 4,
    title: "Don Gonzalo Fernandez de Cordova",
    content: "Succeduto a don Pedro Henrriquez nel 1596 come governatore di Milano, tentò un approccio più deciso contro i signori che proteggevano i bravi. La sua strategia di 'castigare direttamente i capi' rappresentava una novità nel tentativo di ristabilire l'ordine pubblico nel ducato di Milano.",
    category: "Storia",
    pageNumber: 3
  },
  {
    id: 5,
    title: "I Bandi di Grazia nel Seicento",
    content: "I bandi di grazia erano provvedimenti con cui il governatore concedeva l'amnistia ai banditi che si fossero presentati alle autorità. Questi decreti rappresentavano un tentativo di pacificazione sociale, offrendo ai fuorilegge la possibilità di reintegrarsi nella società attraverso il servizio militare nei presidi dello Stato.",
    category: "Diritto",
    pageNumber: 4
  },
  {
    id: 6,
    title: "Don Abbondio e la Società del Seicento",
    content: "La figura di don Abbondio rappresenta il clero minore del XVII secolo: preti di umile origine, senza protezioni nobiliari, costretti a sopravvivere in una società violenta. La sua strategia di 'passare inosservato' riflette la condizione di debolezza in cui versavano i membri più poveri del clero.",
    category: "Società",
    pageNumber: 5
  },
  {
    id: 7,
    title: "Il Sistema della Forza nel Ducato di Milano",
    content: "Nel XVII secolo, la giustizia non proteggeva gli inermi ma solo chi aveva mezzi e protezioni. Il paragone del 'vaso di terra cotta tra vasi di ferro' illustra perfettamente la condizione dei deboli in una società dove prevaleva la legge del più forte, nonostante l'esistenza formale di tribunali e leggi.",
    category: "Società",
    pageNumber: 6
  }
];

export default function Reading() {
  const { chapterId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [startTime] = useState(Date.now());

  const currentChapterId = chapterId ? parseInt(chapterId) : 1;

  // Fetch chapter data
  const { data: chapter, isLoading: chapterLoading } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${currentChapterId}`],
    enabled: !!user && !!currentChapterId,
  });

  // Fetch user progress
  const { data: userProgress, isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: [`/api/users/${user?.id}/progress`],
    enabled: !!user,
  });

  // Get current chapter progress
  const currentProgress = userProgress?.find(p => p.chapterId === currentChapterId);



  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  // Initialize current page from user progress or bookmark
  useEffect(() => {
    if (currentProgress) {
      setCurrentPage(currentProgress.currentPage || 0);
    }
  }, [currentProgress]);

  if (!user) {
    return null;
  }

  if (chapterLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-literary-blue mx-auto mb-4"></div>
            <p className="text-literary-blue">Caricamento capitolo...</p>
          </div>
        </div>
      </div>
    );
  }

  // Use real chapter content if available, otherwise use sample content
  const content = chapter?.content || CHAPTER_CONTENT;
  const title = chapter?.title || "Quel ramo del lago di Como";
  const chapterNumber = chapter?.number || 1;
  
  // Split content into pages by character count
  const totalChars = content.length;
  const totalPages = Math.ceil(totalChars / CHARS_PER_PAGE);
  const startChar = currentPage * CHARS_PER_PAGE;
  const endChar = Math.min(startChar + CHARS_PER_PAGE, totalChars);
  let currentPageContent = content.slice(startChar, endChar);
  
  // If not the last page, avoid cutting mid-word
  if (endChar < totalChars) {
    // First try to find the last complete sentence
    const lastPeriod = currentPageContent.lastIndexOf('.');
    const lastQuestionMark = currentPageContent.lastIndexOf('?');
    const lastExclamation = currentPageContent.lastIndexOf('!');
    const lastSentenceEnd = Math.max(lastPeriod, lastQuestionMark, lastExclamation);
    
    if (lastSentenceEnd > currentPageContent.length * 0.6) { // Se il punto è almeno al 60% della pagina
      currentPageContent = currentPageContent.slice(0, lastSentenceEnd + 1);
    } else {
      // If no good sentence break, find the last complete word
      const lastSpaceIndex = currentPageContent.lastIndexOf(' ');
      if (lastSpaceIndex > currentPageContent.length * 0.5) { // Se lo spazio è almeno al 50% della pagina
        currentPageContent = currentPageContent.slice(0, lastSpaceIndex);
      } else {
        // In casi estremi, cerca almeno una virgola o punto e virgola
        const lastComma = currentPageContent.lastIndexOf(',');
        const lastSemicolon = currentPageContent.lastIndexOf(';');
        const lastPunctuation = Math.max(lastComma, lastSemicolon);
        if (lastPunctuation > currentPageContent.length * 0.5) {
          currentPageContent = currentPageContent.slice(0, lastPunctuation + 1);
        }
      }
    }
  }
  
  // Split into paragraphs for display
  const currentPageLines = currentPageContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  const progressPercentage = Math.round(((currentPage + 1) / totalPages) * 100);
  const isLastPage = currentPage === totalPages - 1;
  const canGoNext = currentPage < totalPages - 1;
  const canGoPrev = currentPage > 0;





  // Save progress function
  const saveProgress = async (page: number, completed: boolean = false) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId: parseInt(chapterId || '1'),
          completed,
          timeSpent: 30 // Approximate 30 seconds per page turn
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      setIsAnimating(false);
      
      // Save progress
      const isCompleted = newPage === totalPages - 1;
      saveProgress(newPage, isCompleted);
    }, 300);
  };

  const handlePrevPage = () => {
    if (!canGoPrev) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      setIsAnimating(false);
      
      // Save progress
      saveProgress(newPage, false);
    }, 300);
  };

  const formatText = (text: string, isFirstParagraph: boolean) => {
    if (isFirstParagraph) {
      // Solo il primo paragrafo ha la lettera capitale
      return text.replace(/^(\w)/, '<span class="text-6xl font-playfair text-literary-blue float-left mr-2 mt-2 leading-none">$1</span>');
    }
    return text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => navigate("/chapters")} 
          className="mb-6 text-amber-700 border-amber-700 hover:bg-amber-700 hover:text-white lg:col-span-4 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna ai Capitoli
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Reading Area */}
          <div className="lg:col-span-3">

            {/* Chapter Header */}
            <Card className="modern-card mb-8">
              <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-playfair text-white font-bold">
                      Capitolo {chapterNumber}
                    </CardTitle>
                    <p className="text-white text-lg mt-2 font-medium">{title}</p>
                  </div>
                  <Badge variant="secondary" className="bg-white/30 text-gray-800 border-white/50 font-medium">
                    {currentPage + 1} di {totalPages}
                  </Badge>
                </div>
              </CardHeader>
          
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-warm-gray">
                Progresso: {progressPercentage}%
              </div>
            </div>
            
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Reading Area */}
        <Card className="modern-card">
          <CardContent className={`p-12 transition-all duration-300 ${isAnimating ? 'opacity-50 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
            <div className="prose prose-lg max-w-none font-crimson text-warm-gray leading-relaxed">
              {currentPageLines.map((line, index) => {
                const isFirstLine = currentPage === 0 && index === 0;
                return (
                  <p 
                    key={index} 
                    className="mb-6 text-left"
                    dangerouslySetInnerHTML={{ 
                      __html: formatText(line, isFirstLine) 
                    }}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Page Progress */}
        <div className="text-center mt-6 mb-4">
          <div className="text-sm text-warm-gray mb-2">
            Pagina {currentPage + 1} di {totalPages}
          </div>
          <Progress value={(currentPage + 1) / totalPages * 100} className="w-48 h-2 mx-auto" />
        </div>

        {/* Navigation Buttons - Centered */}
        <div className="flex justify-center items-center gap-4 mt-6">
          {canGoPrev && (
            <Button 
              onClick={handlePrevPage} 
              disabled={isAnimating}
              variant="outline"
              className="text-amber-700 border-amber-700 hover:bg-amber-700 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Pagina precedente
            </Button>
          )}
          
          {canGoNext ? (
            <Button 
              onClick={handleNextPage} 
              disabled={isAnimating}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              Continua lettura
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : !showQuiz ? (
            <Button 
              onClick={() => setShowQuiz(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Quiz di Comprensione
            </Button>
          ) : null}
        </div>

            {/* Quiz Section - shown at end of chapter */}
            {showQuiz && <QuizSection chapterId={currentChapterId} onComplete={() => setShowQuiz(false)} />}
          </div>

          {/* Sidebar - Historical Context */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              {HISTORICAL_CONTEXTS.filter(context => context.pageNumber === currentPage).map((context) => (
                <Card key={context.id} className="modern-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {context.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-edo-brown">
                      {context.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-warm-gray leading-relaxed">
                      {context.content}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* General historical note if no specific context */}
              {HISTORICAL_CONTEXTS.filter(context => context.pageNumber === currentPage).length === 0 && (
                <Card className="modern-card">
                  <CardHeader>
                    <CardTitle className="text-lg text-edo-brown flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Contesto Storico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-warm-gray">
                      I Promessi Sposi è ambientato tra il 1628 e il 1630, durante il dominio spagnolo in Lombardia. 
                      Manzoni descrive fedelmente la società, i costumi e le condizioni di vita dell'epoca.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}