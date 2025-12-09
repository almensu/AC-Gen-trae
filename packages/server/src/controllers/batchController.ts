import { Request, Response } from 'express';
import { projectService } from '../services/projectService';
import { compositorService } from '../services/compositor';
import { instanceService } from '../services/instanceService';
import { CompositionInput } from '@ac-gen/shared';
import archiver from 'archiver';

export const batchController = {
  generateBatch: async (req: Request, res: Response) => {
    try {
      const { variants } = req.body as { variants: CompositionInput[] };
      
      if (!variants || variants.length === 0) {
        return res.status(400).json({ error: 'No variants provided' });
      }

      // Assume all variants belong to the same project for now
      // Or we fetch project for each variant (less efficient)
      const projectId = variants[0].projectName; // Note: variants store projectName (ID), not ID.
      
      // Need to find project by ID (which is stored in projectName field in CompositionInput based on current logic)
      const projects = await projectService.getAllProjects();
      const project = projects.find(p => p.projectName === projectId); // Matching by unique project name ID

      if (!project) {
        return res.status(404).json({ error: `Project not found: ${projectId}` });
      }

      // Fetch all instances for this project to check for fine-tuned configs
      const instances = await instanceService.getInstancesByProject(project.id);

      // Set up ZIP stream
      res.attachment(`${projectId}_batch_output.zip`);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
      });

      archive.on('error', (err) => {
        res.status(500).send({ error: err.message });
      });

      archive.pipe(res);

      // Process each variant sequentially (or parallel with limit)
      // For MVP, sequential is safer to avoid OOM
      for (const variant of variants) {
        try {
          // Find matching instance config if exists
          const instanceConfig = instances.find(i => 
            i.productId === variant.productId &&
            i.energyLevel === variant.energyLevel &&
            i.capacityCode === variant.capacityCode
          );

          const result = await compositorService.generateImage(variant, project, instanceConfig);
          archive.append(result.buffer, { name: result.fileName });
        } catch (err) {
          console.error(`Failed to generate image for variant`, variant, err);
          // Optionally add an error log text file to the zip
          archive.append(Buffer.from(`Error generating image: ${JSON.stringify(variant)}\n${err}`), { name: `error_${Date.now()}.txt` });
        }
      }

      await archive.finalize();

    } catch (error) {
      console.error('Batch generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
};
