from pathlib import Path
path = Path('src/hooks/useProjectManager.ts')
text = path.read_text()
text = text.replace("        const project = projects.find(p => p.id === projectId);\n        if (!project) return null;\n        const updateState = (updater: (prevState: ProjectState) => ProjectState) => {\n            if(weekKey) updateProjectState(projectId, weekKey, updater);\n        };", "        const project = projects.find(p => p.id === projectId);\n        if (!project) return null;\n        const canEditProject = project.permissions?.canEdit ?? false;\n        const canLogTimeProject = project.permissions?.canLogTime ?? false;\n        const updateState = (updater: (prevState: ProjectState) => ProjectState) => {\n            if (!canEditProject || !weekKey) {\n                return;\n            }\n            updateProjectState(projectId, weekKey, updater);\n        };")
path.write_text(text)
