import { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, AlertTriangle, Loader2, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

interface DiagnosticSummary {
  total: number;
  success: number;
  warnings: number;
  errors: number;
}

export function SystemDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [overallStatus, setOverallStatus] = useState<'success' | 'warning' | 'error' | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    setOverallStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('system-diagnostics', {
        body: { runAll: true },
      });

      if (error) throw error;

      setResults(data.results || []);
      setSummary(data.summary || null);
      setOverallStatus(data.overallStatus || null);
      setTotalDuration(data.totalDuration || null);

      if (data.overallStatus === 'success') {
        toast.success('Alla tester lyckades!');
      } else if (data.overallStatus === 'warning') {
        toast.warning('Vissa integrationer saknar konfiguration');
      } else {
        toast.error('Några tester misslyckades');
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Kunde inte köra diagnostik');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">OK</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Varning</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Fel</Badge>;
      default:
        return null;
    }
  };

  const successPercentage = summary ? (summary.success / summary.total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Systemdiagnostik</CardTitle>
          </div>
          <Button onClick={runDiagnostics} disabled={isRunning} size="sm">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Testar...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Kör diagnostik
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isRunning && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Klicka "Kör diagnostik" för att testa alla integrationer</p>
          </div>
        )}

        {isRunning && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Testar integrationer...</p>
          </div>
        )}

        {summary && !isRunning && (
          <>
            {/* Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Totalt resultat</span>
                <span className="flex items-center gap-2">
                  {getStatusIcon(overallStatus || 'success')}
                  {summary.success} / {summary.total} lyckade
                </span>
              </div>
              <Progress value={successPercentage} className="h-2" />
            </div>

            {/* Duration */}
            {totalDuration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Total tid: {totalDuration}ms</span>
              </div>
            )}

            {/* Results List */}
            <div className="space-y-2 mt-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-sm">{result.name}</p>
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.duration && (
                      <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                    )}
                    {getStatusBadge(result.status)}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center p-2 rounded bg-green-500/10">
                <p className="text-lg font-bold text-green-600">{summary.success}</p>
                <p className="text-xs text-muted-foreground">Lyckade</p>
              </div>
              <div className="text-center p-2 rounded bg-yellow-500/10">
                <p className="text-lg font-bold text-yellow-600">{summary.warnings}</p>
                <p className="text-xs text-muted-foreground">Varningar</p>
              </div>
              <div className="text-center p-2 rounded bg-red-500/10">
                <p className="text-lg font-bold text-red-600">{summary.errors}</p>
                <p className="text-xs text-muted-foreground">Fel</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
