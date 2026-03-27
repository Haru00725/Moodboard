import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StudioSidebar from "@/components/StudioSidebar";
import { getProjects, deleteProject, type Project } from "@/lib/services/databaseService";
import { FolderOpen, Trash2, Eye, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Projects: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    getProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Deleted", description: "Project removed successfully." });
  };

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudioSidebar
        activeTab="projects"
        onTabChange={() => {}}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="font-heading text-3xl lg:text-4xl text-foreground mb-2">
                My <span className="text-gradient-gold">Projects</span>
              </h1>
              <p className="text-muted-foreground font-body">Your saved moodboards and designs</p>
            </div>
            <Button onClick={() => navigate("/studio")} className="font-body">
              <Plus size={18} className="mr-2" />
              New Moodboard
            </Button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <FolderOpen className="text-primary" size={36} />
              </div>
              <h3 className="font-heading text-2xl text-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground font-body mb-6 max-w-sm mx-auto">
                Generate your first moodboard in the Studio and save it to see it here.
              </p>
              <Button onClick={() => navigate("/studio")} className="font-body">
                Go to Studio
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group glass rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden flex items-center justify-center">
                    <FolderOpen className="text-muted-foreground" size={40} />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                      <Button size="sm" variant="secondary" className="font-body" onClick={() => navigate("/studio")}>
                        <Eye size={14} className="mr-1" /> View
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="font-body">
                            <Trash2 size={14} className="mr-1" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{project.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(project.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-heading text-lg text-foreground truncate">{project.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground font-body">
                      <Calendar size={12} />
                      {new Date(project.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>

                    {project.palette && project.palette.length > 0 && (
                      <div className="flex gap-1.5 mt-3">
                        {project.palette.map((color) => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
