import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Users, 
  HelpCircle, 
  BookA, 
  LogOut, 
  Shield,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { apiCall } from "@/lib/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Chapter {
  id: number;
  title: string;
  number: number;
  content?: string;
}

interface GlossaryTerm {
  id: number;
  term: string;
  definition: string;
}

interface Quiz {
  id: number;
  chapterId: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, logout, getAuthHeaders } = useAdminAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  // Modal states
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showCreateGlossary, setShowCreateGlossary] = useState(false);
  
  // Form states for Chapter
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  
  // Form states for Quiz
  const [quizChapterId, setQuizChapterId] = useState("");
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  
  // Form states for Glossary
  const [termName, setTermName] = useState("");
  const [termDefinition, setTermDefinition] = useState("");
  
  // Loading states
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [isCreatingGlossary, setIsCreatingGlossary] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/admin/login");
    } else if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const loadData = async () => {
    try {
      const headers = getAuthHeaders();
      const [chaptersRes, glossaryRes, quizzesRes] = await Promise.all([
        apiCall("/api/chapters", { headers }),
        apiCall("/api/glossary", { headers }),
        apiCall("/api/admin/quizzes", { headers })
      ]);

      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData);
      }

      if (glossaryRes.ok) {
        const glossaryData = await glossaryRes.json();
        setGlossary(glossaryData);
      }

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData);
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  // Handler functions for creating content
  const handleCreateChapter = () => {
    setShowCreateChapter(true);
  };

  const handleCreateQuiz = () => {
    setShowCreateQuiz(true);
  };

  const handleCreateGlossary = () => {
    setShowCreateGlossary(true);
  };

  // Reset form functions
  const resetChapterForm = () => {
    setChapterNumber("");
    setChapterTitle("");
    setChapterContent("");
  };

  const resetQuizForm = () => {
    setQuizChapterId("");
    setQuizQuestion("");
    setQuizOptions(["", "", "", ""]);
    setCorrectAnswer("");
  };

  const resetGlossaryForm = () => {
    setTermName("");
    setTermDefinition("");
  };

  // Save functions
  const saveChapter = async () => {
    if (!chapterNumber || !chapterTitle || !chapterContent) {
      alert("Compila tutti i campi!");
      return;
    }

    setIsCreatingChapter(true);
    try {
      const headers = getAuthHeaders();
      const response = await apiCall("/api/admin/chapters", {
        method: "POST",
        headers,
        body: JSON.stringify({
          number: parseInt(chapterNumber),
          title: chapterTitle,
          content: chapterContent,
        }),
      });

      if (response.ok) {
        await loadData(); // Reload chapters
        setShowCreateChapter(false);
        resetChapterForm();
        alert("Capitolo creato con successo!");
      } else {
        const error = await response.json();
        alert(`Errore: ${error.message || "Impossibile creare il capitolo"}`);
      }
    } catch (err) {
      alert("Errore di connessione");
    } finally {
      setIsCreatingChapter(false);
    }
  };

  const saveQuiz = async () => {
    if (!quizChapterId || !quizQuestion || !correctAnswer || quizOptions.some(opt => !opt.trim())) {
      alert("Compila tutti i campi!");
      return;
    }

    setIsCreatingQuiz(true);
    try {
      const headers = getAuthHeaders();
      const response = await apiCall("/api/admin/quizzes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          chapterId: parseInt(quizChapterId),
          question: quizQuestion,
          options: quizOptions,
          correctAnswer: parseInt(correctAnswer),
        }),
      });

      if (response.ok) {
        await loadData(); // Reload quizzes
        setShowCreateQuiz(false);
        resetQuizForm();
        alert("Quiz creato con successo!");
      } else {
        const error = await response.json();
        alert(`Errore: ${error.message || "Impossibile creare il quiz"}`);
      }
    } catch (err) {
      alert("Errore di connessione");
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const saveGlossaryTerm = async () => {
    if (!termName || !termDefinition) {
      alert("Compila tutti i campi!");
      return;
    }

    setIsCreatingGlossary(true);
    try {
      const headers = getAuthHeaders();
      const response = await apiCall("/api/glossary", {
        method: "POST",
        headers,
        body: JSON.stringify({
          term: termName,
          definition: termDefinition,
        }),
      });

      if (response.ok) {
        await loadData(); // Reload glossary
        setShowCreateGlossary(false);
        resetGlossaryForm();
        alert("Termine creato con successo!");
      } else {
        const error = await response.json();
        alert(`Errore: ${error.message || "Impossibile creare il termine"}`);
      }
    } catch (err) {
      alert("Errore di connessione");
    } finally {
      setIsCreatingGlossary(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-literary-blue"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-literary-blue" />
              <h1 className="text-xl font-bold text-gray-900">
                Pannello Admin - PromessiSposi.io
              </h1>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Esci</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Capitoli</p>
                  <p className="text-3xl font-bold text-literary-blue">{chapters.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-literary-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Quiz</p>
                  <p className="text-3xl font-bold text-accent-gold">{quizzes.length}</p>
                </div>
                <HelpCircle className="h-8 w-8 text-accent-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Glossario</p>
                  <p className="text-3xl font-bold text-emerald-600">{glossary.length}</p>
                </div>
                <BookA className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Utenti</p>
                  <p className="text-3xl font-bold text-purple-600">-</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Management Tabs */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Gestione Contenuti</span>
            </CardTitle>
            <CardDescription>
              Gestisci capitoli, quiz e termini del glossario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chapters" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chapters">Capitoli</TabsTrigger>
                <TabsTrigger value="quizzes">Quiz</TabsTrigger>
                <TabsTrigger value="glossary">Glossario</TabsTrigger>
              </TabsList>

              {/* Chapters Tab */}
              <TabsContent value="chapters" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Capitoli ({chapters.length})</h3>
                  <Button 
                    size="sm" 
                    className="bg-literary-blue hover:bg-literary-blue/90"
                    onClick={handleCreateChapter}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Capitolo
                  </Button>
                </div>
                <div className="space-y-3">
                  {chapters.map((chapter) => (
                    <div key={chapter.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            Capitolo {chapter.number}: {chapter.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            ID: {chapter.id}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chapters.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Nessun capitolo trovato. Aggiungi il primo capitolo per iniziare.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* Quizzes Tab */}
              <TabsContent value="quizzes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Quiz ({quizzes.length})</h3>
                  <Button 
                    size="sm" 
                    className="bg-accent-gold hover:bg-accent-gold/90"
                    onClick={handleCreateQuiz}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Quiz
                  </Button>
                </div>
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{quiz.question}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Capitolo {quiz.chapterId} • ID: {quiz.id}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {quizzes.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Nessun quiz trovato. Aggiungi il primo quiz per iniziare.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* Glossary Tab */}
              <TabsContent value="glossary" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Glossario ({glossary.length})</h3>
                  <Button 
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-600/90"
                    onClick={handleCreateGlossary}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Termine
                  </Button>
                </div>
                <div className="space-y-3">
                  {glossary.map((term) => (
                    <div key={term.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{term.term}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {term.definition.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {glossary.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        Nessun termine trovato. Aggiungi il primo termine per iniziare.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Create Chapter Modal */}
      <Dialog open={showCreateChapter} onOpenChange={setShowCreateChapter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuovo Capitolo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="chapter-number">Numero Capitolo</Label>
              <Input 
                id="chapter-number" 
                type="number" 
                placeholder="1" 
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="chapter-title">Titolo</Label>
              <Input 
                id="chapter-title" 
                placeholder="Titolo del capitolo" 
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="chapter-content">Contenuto</Label>
              <Textarea 
                id="chapter-content" 
                placeholder="Contenuto del capitolo..." 
                rows={10} 
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateChapter(false);
                resetChapterForm();
              }}>
                Annulla
              </Button>
              <Button 
                className="bg-literary-blue hover:bg-literary-blue/90"
                onClick={saveChapter}
                disabled={isCreatingChapter}
              >
                {isCreatingChapter ? "Creazione..." : "Crea Capitolo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Quiz Modal */}
      <Dialog open={showCreateQuiz} onOpenChange={setShowCreateQuiz}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuovo Quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quiz-chapter">Capitolo</Label>
              <Select value={quizChapterId} onValueChange={setQuizChapterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona capitolo" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id.toString()}>
                      Capitolo {chapter.number}: {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quiz-question">Domanda</Label>
              <Textarea 
                id="quiz-question" 
                placeholder="Inserisci la domanda..." 
                rows={3} 
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
              />
            </div>
            <div>
              <Label>Opzioni di Risposta</Label>
              <div className="space-y-2">
                <Input 
                  placeholder="Opzione A" 
                  value={quizOptions[0]}
                  onChange={(e) => {
                    const newOptions = [...quizOptions];
                    newOptions[0] = e.target.value;
                    setQuizOptions(newOptions);
                  }}
                />
                <Input 
                  placeholder="Opzione B" 
                  value={quizOptions[1]}
                  onChange={(e) => {
                    const newOptions = [...quizOptions];
                    newOptions[1] = e.target.value;
                    setQuizOptions(newOptions);
                  }}
                />
                <Input 
                  placeholder="Opzione C" 
                  value={quizOptions[2]}
                  onChange={(e) => {
                    const newOptions = [...quizOptions];
                    newOptions[2] = e.target.value;
                    setQuizOptions(newOptions);
                  }}
                />
                <Input 
                  placeholder="Opzione D" 
                  value={quizOptions[3]}
                  onChange={(e) => {
                    const newOptions = [...quizOptions];
                    newOptions[3] = e.target.value;
                    setQuizOptions(newOptions);
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="correct-answer">Risposta Corretta</Label>
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona risposta corretta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Opzione A</SelectItem>
                  <SelectItem value="1">Opzione B</SelectItem>
                  <SelectItem value="2">Opzione C</SelectItem>
                  <SelectItem value="3">Opzione D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateQuiz(false);
                resetQuizForm();
              }}>
                Annulla
              </Button>
              <Button 
                className="bg-accent-gold hover:bg-accent-gold/90"
                onClick={saveQuiz}
                disabled={isCreatingQuiz}
              >
                {isCreatingQuiz ? "Creazione..." : "Crea Quiz"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Glossary Term Modal */}
      <Dialog open={showCreateGlossary} onOpenChange={setShowCreateGlossary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuovo Termine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="term-name">Termine</Label>
              <Input 
                id="term-name" 
                placeholder="Nome del termine" 
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="term-definition">Definizione</Label>
              <Textarea 
                id="term-definition" 
                placeholder="Definizione del termine..." 
                rows={6} 
                value={termDefinition}
                onChange={(e) => setTermDefinition(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateGlossary(false);
                resetGlossaryForm();
              }}>
                Annulla
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-600/90"
                onClick={saveGlossaryTerm}
                disabled={isCreatingGlossary}
              >
                {isCreatingGlossary ? "Creazione..." : "Crea Termine"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}