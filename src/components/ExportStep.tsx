import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Link2, 
  Video, 
  Check, 
  Loader2, 
  Cloud, 
  GraduationCap, 
  ExternalLink,
  Copy,
  RefreshCw,
  AlertCircle,
  Save,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { CourseOutline, ModuleAudio } from '@/types/course';

interface BunnyVideo {
  id: string;
  title: string;
  status: string;
  statusCode: number;
  length: number;
  embedUrl: string;
  directPlayUrl: string;
  thumbnailUrl?: string;
}

interface ExportStepProps {
  outline: CourseOutline | null;
  moduleAudio: Record<string, ModuleAudio>;
  courseTitle: string;
  onComplete?: () => void;
}

export function ExportStep({ outline, moduleAudio, courseTitle, onComplete }: ExportStepProps) {
  // Bunny.net state
  const [bunnyVideos, setBunnyVideos] = useState<BunnyVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [uploadingUrl, setUploadingUrl] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // LearnDash state
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ courseId: number; courseUrl: string; lessonsCreated: number } | null>(null);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // Module to video mapping
  const [moduleVideoMap, setModuleVideoMap] = useState<Record<string, string>>({});

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingCredentials(false);
        return;
      }

      const { data, error } = await supabase
        .from('learndash_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setWpUrl(data.wp_url);
        setWpUsername(data.wp_username);
        setWpAppPassword(data.wp_app_password);
        setCredentialsSaved(true);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const saveCredentials = async () => {
    if (!wpUrl || !wpUsername || !wpAppPassword) {
      toast({ title: 'Fill in all credentials first', variant: 'destructive' });
      return;
    }

    setIsSavingCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please log in to save credentials', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('learndash_credentials')
        .upsert({
          user_id: user.id,
          wp_url: wpUrl,
          wp_username: wpUsername,
          wp_app_password: wpAppPassword,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setCredentialsSaved(true);
      toast({ title: 'Credentials saved', description: 'Your LearnDash credentials have been saved securely.' });
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast({ title: 'Failed to save credentials', variant: 'destructive' });
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const loadBunnyVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-video', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setBunnyVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load Bunny videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos from Bunny.net',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const uploadFromUrl = async () => {
    if (!uploadingUrl) {
      toast({ title: 'Enter a video URL', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-video', {
        body: { 
          action: 'fetch', 
          videoUrl: uploadingUrl,
          title: uploadTitle || 'Uploaded Video',
        },
      });

      if (error) throw error;

      toast({
        title: 'Upload Started',
        description: 'Video is being fetched and processed. This may take a few minutes.',
      });
      
      setUploadingUrl('');
      setUploadTitle('');
      
      // Refresh video list after a delay
      setTimeout(loadBunnyVideos, 5000);
    } catch (error) {
      console.error('Failed to upload from URL:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to fetch video from URL',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast({ title: 'Select a file', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Create video placeholder
      const { data: createData, error: createError } = await supabase.functions.invoke('bunny-video', {
        body: { 
          action: 'create', 
          title: uploadTitle || selectedFile.name,
        },
      });

      if (createError) throw createError;

      const { uploadUrl, accessKey, videoId } = createData;

      // Step 2: Upload file directly to Bunny.net
      setUploadProgress(10);
      
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('AccessKey', accessKey);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 90) + 10;
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200 || xhr.status === 201) {
          toast({
            title: 'Upload Complete',
            description: 'Video uploaded successfully. Processing may take a few minutes.',
          });
          setSelectedFile(null);
          setUploadTitle('');
          setUploadProgress(100);
          setTimeout(loadBunnyVideos, 3000);
        } else {
          throw new Error(`Upload failed: ${xhr.statusText}`);
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        toast({
          title: 'Upload Failed',
          description: 'Network error during upload',
          variant: 'destructive',
        });
        setIsUploading(false);
      };

      xhr.send(selectedFile);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const testLearnDashConnection = async () => {
    if (!wpUrl || !wpUsername || !wpAppPassword) {
      toast({ title: 'Fill in all WordPress credentials', variant: 'destructive' });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('learndash-export', {
        body: {
          action: 'test',
          wpUrl,
          wpUsername,
          wpAppPassword,
        },
      });

      if (error) throw error;

      setConnectionStatus('success');
      toast({ title: 'Connection Successful', description: 'LearnDash API is accessible' });
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      toast({
        title: 'Connection Failed',
        description: 'Check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const exportToLearnDash = async () => {
    if (!outline) {
      toast({ title: 'No course to export', variant: 'destructive' });
      return;
    }

    if (connectionStatus !== 'success') {
      toast({ title: 'Test connection first', variant: 'destructive' });
      return;
    }

    setIsExporting(true);

    try {
      // Prepare lessons with video URLs from module mapping
      const lessons = outline.modules.map((module) => ({
        title: module.title,
        content: module.description,
        videoUrl: moduleVideoMap[module.id] || '',
      }));

      const { data, error } = await supabase.functions.invoke('learndash-export', {
        body: {
          action: 'create-course',
          wpUrl,
          wpUsername,
          wpAppPassword,
          courseTitle: courseTitle || outline.title,
          courseDescription: outline.description,
          lessons,
        },
      });

      if (error) throw error;

      setExportResult(data);
      toast({
        title: 'Export Successful',
        description: `Course created with ${data.lessonsCreated} lessons`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to create course in LearnDash',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyVideoUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied to clipboard' });
  };

  const assignVideoToModule = (moduleId: string, videoUrl: string) => {
    setModuleVideoMap((prev) => ({ ...prev, [moduleId]: videoUrl }));
    toast({ title: 'Video assigned to module' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finished':
        return <Badge className="bg-green-500/20 text-green-400">Ready</Badge>;
      case 'processing':
      case 'transcoding':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400">Error</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Export & Upload</h2>
        <p className="text-muted-foreground">
          Upload videos to Bunny.net and export to LearnDash
        </p>
      </div>

      <Tabs defaultValue="bunny" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bunny" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Bunny.net Videos
          </TabsTrigger>
          <TabsTrigger value="learndash" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            LearnDash Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bunny" className="space-y-4 mt-4">
          {/* Upload Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Video</CardTitle>
              <CardDescription>Upload videos to your Bunny.net library</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <Link2 className="h-4 w-4 mr-2" />
                    From URL
                  </TabsTrigger>
                  <TabsTrigger value="file">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input
                      placeholder="https://example.com/video.mp4"
                      value={uploadingUrl}
                      onChange={(e) => setUploadingUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      placeholder="Video title"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={uploadFromUrl} 
                    disabled={isUploading || !uploadingUrl}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Fetch from URL
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Video File</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      placeholder="Video title"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground text-center">
                        {uploadProgress}% uploaded
                      </p>
                    </div>
                  )}
                  <Button 
                    onClick={uploadFile} 
                    disabled={isUploading || !selectedFile}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Video Library */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Video Library</CardTitle>
                <CardDescription>Your Bunny.net videos</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadBunnyVideos} disabled={isLoadingVideos}>
                {isLoadingVideos ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {bunnyVideos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No videos found. Click refresh to load your library.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {bunnyVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{video.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(video.status)}
                            {video.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {Math.floor(video.length / 60)}:{String(video.length % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyVideoUrl(video.embedUrl)}
                          title="Copy embed URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(video.directPlayUrl, '_blank')}
                          title="Preview video"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module Video Assignment */}
          {outline && bunnyVideos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assign Videos to Modules</CardTitle>
                <CardDescription>Map your videos to course modules for LearnDash export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outline.modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{module.title}</p>
                        {moduleVideoMap[module.id] && (
                          <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" />
                            Video assigned
                          </p>
                        )}
                      </div>
                      <select
                        className="text-sm border rounded-md px-2 py-1 bg-background"
                        value={moduleVideoMap[module.id] || ''}
                        onChange={(e) => assignVideoToModule(module.id, e.target.value)}
                      >
                        <option value="">Select video</option>
                        {bunnyVideos
                          .filter((v) => v.status === 'finished')
                          .map((video) => (
                            <option key={video.id} value={video.embedUrl}>
                              {video.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="learndash" className="space-y-4 mt-4">
          {/* WordPress Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                WordPress Connection
                {credentialsSaved && (
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect to your WordPress site with LearnDash installed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>WordPress Site URL</Label>
                    <Input
                      placeholder="https://yoursite.com"
                      value={wpUrl}
                      onChange={(e) => { setWpUrl(e.target.value); setCredentialsSaved(false); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="admin"
                      value={wpUsername}
                      onChange={(e) => { setWpUsername(e.target.value); setCredentialsSaved(false); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Password</Label>
                    <Input
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={wpAppPassword}
                      onChange={(e) => { setWpAppPassword(e.target.value); setCredentialsSaved(false); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create an application password in WordPress: Users → Your Profile → Application Passwords
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={testLearnDashConnection}
                      disabled={isTestingConnection}
                      variant={connectionStatus === 'success' ? 'outline' : 'default'}
                      className="flex-1"
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : connectionStatus === 'success' ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                          Connected
                        </>
                      ) : connectionStatus === 'error' ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                          Retry Connection
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                    <Button
                      onClick={saveCredentials}
                      disabled={isSavingCredentials || !wpUrl || !wpUsername || !wpAppPassword}
                      variant="outline"
                    >
                      {isSavingCredentials ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : credentialsSaved ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Export Button */}
          {connectionStatus === 'success' && outline && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Course</CardTitle>
                <CardDescription>
                  Create "{courseTitle || outline.title}" in LearnDash with {outline.modules.length} lessons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(moduleVideoMap).length > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">
                      <Check className="h-4 w-4 inline mr-2" />
                      {Object.keys(moduleVideoMap).length} videos will be attached to lessons
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={exportToLearnDash}
                  disabled={isExporting}
                  className="w-full"
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting to LearnDash...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Export to LearnDash
                    </>
                  )}
                </Button>

                {exportResult && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                    <p className="font-medium text-green-400">Export Successful!</p>
                    <p className="text-sm text-muted-foreground">
                      Created course with {exportResult.lessonsCreated} lessons
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(exportResult.courseUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in WordPress
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Copy Option */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Export</CardTitle>
              <CardDescription>Copy video URLs to paste into LearnDash manually</CardDescription>
            </CardHeader>
            <CardContent>
              {bunnyVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Load your Bunny.net videos first to see URLs here
                </p>
              ) : (
                <div className="space-y-2">
                  {bunnyVideos.filter((v) => v.status === 'finished').map((video) => (
                    <div key={video.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate flex-1">{video.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyVideoUrl(video.embedUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
