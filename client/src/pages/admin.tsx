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
        fetch("/api/chapters", { headers }),
        fetch("/api/glossary", { headers }),
        fetch("/api/admin/quizzes", { headers })
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
                  <Button size="sm" className="bg-literary-blue hover:bg-literary-blue/90">
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
                  <Button size="sm" className="bg-accent-gold hover:bg-accent-gold/90">
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
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-600/90">
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
    </div>
  );
}
