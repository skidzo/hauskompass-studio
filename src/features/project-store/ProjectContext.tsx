import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getActiveSlug, loadProject, saveProject, setActiveSlug } from './projectStore';
import type { ImportedProject } from './types';

interface ProjectContextValue {
    activeProject: ImportedProject | null;
    activateProject: (slug: string) => void;
    deactivateProject: () => void;
    /** Persist an in-place update to the active project (e.g. confirmedIds changed in-app). */
    updateProject: (project: ImportedProject) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
    activeProject: null,
    activateProject: () => undefined,
    deactivateProject: () => undefined,
    updateProject: () => undefined,
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [activeProject, setActiveProject] = useState<ImportedProject | null>(() => {
        const slug = getActiveSlug();
        return slug ? loadProject(slug) : null;
    });

    const activateProject = useCallback((slug: string) => {
        const project = loadProject(slug);
        if (project) {
            setActiveSlug(slug);
            setActiveProject(project);
        }
    }, []);

    const deactivateProject = useCallback(() => {
        setActiveSlug(null);
        setActiveProject(null);
    }, []);

    const updateProject = useCallback((project: ImportedProject) => {
        saveProject(project);
        setActiveProject((prev) => (prev?.slug === project.slug ? project : prev));
    }, []);

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === 'hk_active_project') {
                const slug = e.newValue;
                setActiveProject(slug ? loadProject(slug) : null);
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    return (
        <ProjectContext.Provider value={{ activeProject, activateProject, deactivateProject, updateProject }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    return useContext(ProjectContext);
}
