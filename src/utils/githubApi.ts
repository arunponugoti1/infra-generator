import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  path: string;
  content: string;
}

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  private encodeBase64(content: string): string {
    // Use TextEncoder to properly handle UTF-8 characters
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // Convert Uint8Array to base64
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  async createOrUpdateFiles(
    owner: string,
    repo: string,
    files: GitHubFile[],
    commitMessage: string = 'Add Terraform infrastructure files'
  ): Promise<void> {
    try {
      // First, verify the repository exists and we have access
      await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      // Get the default branch
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      
      const defaultBranch = repoData.default_branch;

      // Get the latest commit SHA
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });

      const latestCommitSha = refData.object.sha;

      // Get the tree of the latest commit
      const { data: commitData } = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          try {
            const { data: blobData } = await this.octokit.rest.git.createBlob({
              owner,
              repo,
              content: this.encodeBase64(file.content),
              encoding: 'base64',
            });
            return {
              path: file.path,
              mode: '100644' as const,
              type: 'blob' as const,
              sha: blobData.sha,
            };
          } catch (blobError) {
            console.error(`Error creating blob for file ${file.path}:`, blobError);
            throw new Error(`Failed to create blob for ${file.path}: ${blobError instanceof Error ? blobError.message : 'Unknown error'}`);
          }
        })
      );

      // Create a new tree
      const { data: treeData } = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: commitData.tree.sha,
        tree: blobs,
      });

      // Create a new commit
      const { data: newCommitData } = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeData.sha,
        parents: [latestCommitSha],
      });

      // Update the reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
        sha: newCommitData.sha,
      });

    } catch (error) {
      console.error('Error uploading files to GitHub:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Not Found')) {
          throw new Error('Repository not found or insufficient permissions. Please check:\n1. Repository owner and name are correct\n2. Personal Access Token has "repo" scope permissions\n3. You have write access to the repository');
        } else if (error.message.includes('Bad credentials')) {
          throw new Error('Invalid Personal Access Token. Please check your token and ensure it has the required permissions.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded. Please wait a few minutes and try again.');
        }
      }
      
      throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    inputs: Record<string, string>
  ): Promise<void> {
    try {
      // Get the default branch first
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      
      const defaultBranch = repoData.default_branch;

      await this.octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref: defaultBranch,
        inputs,
      });
    } catch (error) {
      console.error('Error triggering workflow:', error);
      throw new Error(`Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWorkflowRuns(
    owner: string,
    repo: string,
    workflowId: string
  ): Promise<WorkflowRun[]> {
    try {
      const { data } = await this.octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId,
        per_page: 10,
      });
      return data.workflow_runs.map(run => ({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
        run_number: run.run_number,
      }));
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      return [];
    }
  }

  async getWorkflowRunJobs(
    owner: string,
    repo: string,
    runId: number
  ): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });
      return data.jobs;
    } catch (error) {
      console.error('Error fetching workflow jobs:', error);
      return [];
    }
  }

  async getWorkflowRunLogs(
    owner: string,
    repo: string,
    runId: number
  ): Promise<string> {
    try {
      const { data } = await this.octokit.rest.actions.downloadWorkflowRunLogs({
        owner,
        repo,
        run_id: runId,
      });
      return data as string;
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      return '';
    }
  }

  async checkRepository(owner: string, repo: string): Promise<boolean> {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      
      // Check if we have push access to the repository
      return data.permissions?.push === true || data.permissions?.admin === true;
    } catch (error) {
      // Return false for any error (including 404 Not Found)
      // Don't log the error as it's expected behavior when repository doesn't exist
      return false;
    }
  }

  async getRepositoryInfo(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      return data;
    } catch (error) {
      console.error('Error fetching repository info:', error);
      throw error;
    }
  }
}