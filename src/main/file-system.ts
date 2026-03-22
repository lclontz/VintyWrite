import fs from 'node:fs/promises'
import path from 'node:path'

export interface FileEntry {
  id: string
  filename: string
  title: string
}

export interface ProjectManifest {
  title: string
  files: FileEntry[]
}

export async function readManifest(projectDir: string): Promise<ProjectManifest> {
  const raw = await fs.readFile(path.join(projectDir, 'project.json'), 'utf-8')
  return JSON.parse(raw) as ProjectManifest
}

export async function writeManifest(projectDir: string, manifest: ProjectManifest): Promise<void> {
  await fs.writeFile(
    path.join(projectDir, 'project.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
}

export async function readMarkdownFile(projectDir: string, filename: string): Promise<string> {
  return fs.readFile(path.join(projectDir, filename), 'utf-8')
}

export async function writeMarkdownFile(
  projectDir: string,
  filename: string,
  content: string
): Promise<void> {
  await fs.writeFile(path.join(projectDir, filename), content, 'utf-8')
}

export async function createMarkdownFile(projectDir: string, filename: string): Promise<void> {
  await fs.writeFile(path.join(projectDir, filename), '', { flag: 'wx' })
}

export async function deleteMarkdownFile(projectDir: string, filename: string): Promise<void> {
  await fs.unlink(path.join(projectDir, filename))
}

export async function fileExists(projectDir: string, filename: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, filename))
    return true
  } catch {
    return false
  }
}
