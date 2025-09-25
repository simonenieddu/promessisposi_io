import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/header";

export default function Introduction() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/chapters")}
            className="text-edo-brown hover:text-edo-brown/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna ai capitoli
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <BookOpen className="h-12 w-12 text-edo-brown" />
            </div>
            <CardTitle className="text-3xl text-edo-brown mb-2">
              Introduzione dell'Autore
            </CardTitle>
            <p className="text-edo-brown/70">
              Alessandro Manzoni presenta il suo capolavoro
            </p>
          </CardHeader>
          
          <CardContent className="prose prose-amber max-w-none">
            <div className="text-lg leading-relaxed space-y-6 text-gray-700">
              <p className="font-medium text-edo-brown text-xl">
                L'Historia si può veramente deffinire una guerra illustre contro il Tempo, perché togliendoli di mano gl'anni suoi prigionieri, anzi già fatti cadaueri, li richiama in vita, li passa in rassegna, e li schiera di nuovo in battaglia.
              </p>
              
              <p>
                Ma gl'illustri Campioni che in tal Arringo fanno messe di Palme e d'Allori, rapiscono solo che le sole spoglie più sfarzose e brillanti, imbalsamando co' loro inchiostri le Imprese de Principi e de Potentati, e qualificati Personaggi, e trapontando ornando co' loro ricami el ampio Fiume di quella Storia, che dalla prima origine del Mondo scorre al Mare dell'Eternità.
              </p>

              <p>
                Ma lasciando stare i Potentati, Principi e qualificati Personaggi, mi son messo a far una cosa diversa. Questa è la storia di due poveri giovani, Renzo e Lucia, e delle loro avventure; storia che ho trovato in certi antichi manoscritti, e che ora presento al lettore, arricchita di tutte quelle notizie che ho potuto raccogliere intorno a quei tempi e a quei luoghi.
              </p>

              <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-edo-brown">
                <h3 className="text-edo-brown font-semibold mb-3">Note dell'Autore</h3>
                <p className="italic">
                  "Il buon curato, quello della dottrina cristiana, pareva che non la finisse mai di fare i suoi bravi ragionamenti; e più d'una volta, nel copiare, mi è saltata la tentazione di tagliar via; ho per altro sempre resistito..."
                </p>
              </div>

              <p>
                L'ignoto autore del manoscritto secentesco aveva sì buone intenzioni, e racconta in buona fede gli avvenimenti di cui fu testimone, o che almeno gli furon narrati da persone degne di fede; ma quello stile! quelle grazie spagnolesche a ogni pie' sospinto! quegli aggettivi così fuor di luogo! quella così falsa e affettata dignità! 
              </p>

              <p>
                Ho dovuto rifarlo interamente, conservando però la sostanza della narrazione, e badando solo a correggere la lingua e a levare alcuni difetti più grossolani del primitivo testo.
              </p>

              <div className="bg-edo-cream p-6 rounded-lg">
                <h3 className="text-edo-brown font-semibold mb-3">Ambientazione Storica</h3>
                <p>
                  La storia si svolge in Lombardia, negli anni 1628-1630, durante la dominazione spagnola. I protagonisti sono due giovani del popolo: Renzo Tramaglino, filatore di seta, e Lucia Mondella, operaia dell'industria serica, abitanti in un paese sulla riva orientale del ramo di Como del lago Lario.
                </p>
              </div>

              <p className="text-center font-medium text-edo-brown">
                E ora, iniziamo la nostra storia...
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => setLocation("/chapters/1")}
            className="bg-edo-brown hover:bg-edo-brown/90 text-white px-8 py-3 text-lg"
          >
            Inizia Capitolo 1
            <BookOpen className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}