"use client";

import { FormEvent, useState } from "react";
import { Folder, Project } from "@/lib/api/types";

type ProjectTreeProps = {
  projects: Project[];
  folders: Folder[];
  selectedProjectId: string | null;
  selectedFolderId: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onCreateFolder: (projectId: string, name: string) => Promise<void>;
};

export function ProjectTree({
  projects,
  folders,
  selectedProjectId,
  selectedFolderId,
  onSelectProject,
  onSelectFolder,
  onCreateProject,
  onCreateFolder
}: ProjectTreeProps) {
  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectName.trim()) {
      return;
    }
    await onCreateProject(projectName.trim());
    setProjectName("");
  };

  const submitFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProjectId || !folderName.trim()) {
      return;
    }
    await onCreateFolder(selectedProjectId, folderName.trim());
    setFolderName("");
  };

  return (
    <section className="route-card" data-testid="vault-project-tree">
      <h2>Projects &amp; Folders</h2>

      <form onSubmit={submitProject} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          aria-label="Project name"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="New project"
          data-testid="project-name-input"
        />
        <button type="submit" data-testid="create-project-btn">
          Create
        </button>
      </form>

      <form onSubmit={submitFolder} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          aria-label="Folder name"
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          placeholder="New folder"
          data-testid="folder-name-input"
        />
        <button type="submit" disabled={!selectedProjectId} data-testid="create-folder-btn">
          Create
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {projects.map((project) => {
          const projectFolders = folders.filter((folder) => folder.projectId === project.id);

          return (
            <li key={project.id} style={{ marginBottom: "0.75rem" }}>
              <button
                type="button"
                onClick={() => onSelectProject(project.id)}
                style={{ fontWeight: selectedProjectId === project.id ? 700 : 500 }}
                data-testid={`project-${project.id}`}
              >
                {project.name}
              </button>

              <ul style={{ listStyle: "none", margin: "0.35rem 0 0 0.75rem", padding: 0 }}>
                {projectFolders.map((folder) => (
                  <li key={folder.id}>
                    <button
                      type="button"
                      onClick={() => onSelectFolder(folder.id)}
                      style={{ fontWeight: selectedFolderId === folder.id ? 700 : 400 }}
                      data-testid={`folder-${folder.id}`}
                    >
                      {folder.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
