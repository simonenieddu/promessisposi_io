import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/header";
import { 
  BookOpen, 
  Target, 
  Trophy,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Brain
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Chapter {
  id: number;
  number: number;
  title: string;
  summary: string;
}

interface Quiz {
  id: number;
  chapterId: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}

// Componente Quiz Section per il ripasso
function ReviewQuizSection({ 
  chapterId, 
  chapterTitle,
  onComplete 
}: { 
  chapterId: number; 
  chapterTitle: string;
  onComplete: () => void;
}) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  const { data: quizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: [`/api/chapters/${chapterId}/quizzes`],
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({ answers, score }: { answers: number[], score: number }) => {
      await apiRequest('POST', `/api/chapters/${chapterId}/quiz-results`, {
        answers,
        score,
        totalQuestions: quizzes?.length || 0
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
    if (currentQuizIndex < (quizzes?.length || 0) - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setShowExplanation(false);
    } else {
      // Calcola il punteggio
      let totalScore = 0;
      selectedAnswers.forEach((answer, index) => {
        if (answer === quizzes[index].correctAnswer) {
          totalScore += quizzes[index].points;
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
      <Card className="modern-card">
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
      <Card className="modern-card">
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 text-amber-600 mx-auto mb-4" />
          <p className="text-warm-gray mb-4">
            Quiz non disponibile per questo capitolo
          </p>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const maxScore = quizzes.reduce((sum, quiz) => sum + quiz.points, 0);
    const percentage = Math.round((score / maxScore) * 100);
    
    return (
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="text-amber-700 flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Risultati Quiz - {chapterTitle}
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

            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={handleRetakeQuiz} variant="outline" className="text-amber-700 border-amber-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rifai Quiz
              </Button>
              <Button onClick={onComplete} className="bg-amber-700 hover:bg-amber-800">
                Torna al Ripasso
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
    <Card className="modern-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-700">
            {chapterTitle}
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
                    <p className="font-semibold text-green-700">Risposta Corretta!</p>
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

export default function Review() {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const navigate = useLocation()[1];

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['/api/chapters'],
  });

  if (chaptersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-warm-gray">Caricamento capitoli...</p>
          </div>
        </div>
      </div>
    );
  }

  // Se un capitolo è selezionato, mostra il quiz
  if (selectedChapter) {
    const chapter = chapters?.find(c => c.id === selectedChapter);
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Button 
              onClick={() => setSelectedChapter(null)}
              variant="outline"
              className="text-amber-700 border-amber-700 hover:bg-amber-50"
            >
              ← Torna al Ripasso
            </Button>
          </div>
          <ReviewQuizSection 
            chapterId={selectedChapter}
            chapterTitle={chapter?.title || `Capitolo ${chapter?.number}`}
            onComplete={() => setSelectedChapter(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header della pagina */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-warm-gray">Ripassa</h1>
          </div>
          <p className="text-lg text-warm-gray/80 max-w-2xl mx-auto">
            Testa la tua comprensione con i quiz di ogni capitolo. Perfetto per ripassare prima di un esame o per consolidare le tue conoscenze.
          </p>
        </div>

        {/* Lista dei capitoli */}
        <div className="grid gap-6 md:grid-cols-2">
          {chapters?.map((chapter) => (
            <Card key={chapter.id} className="modern-card hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-700 group-hover:text-amber-800 transition-colors">
                    Capitolo {chapter.number}
                  </CardTitle>
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-warm-gray line-clamp-2">
                  {chapter.title}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-warm-gray/80 mb-4 line-clamp-3">
                  {chapter.summary}
                </p>
                
                <Button 
                  onClick={() => setSelectedChapter(chapter.id)}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white"
                >
                  Inizia Quiz
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info utile */}
        <Card className="modern-card mt-12 bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <BookOpen className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Come funziona il ripasso</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Ogni quiz contiene domande specifiche sul capitolo</li>
                  <li>• Ricevi feedback immediato per ogni risposta</li>
                  <li>• Guadagni punti per le risposte corrette</li>
                  <li>• Puoi rifare i quiz tutte le volte che vuoi</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}