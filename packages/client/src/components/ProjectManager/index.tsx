import React from 'react';
import { Card } from 'antd';
import { ProjectList } from './ProjectList';
import { CreateProjectModal } from './CreateProjectModal';

export const ProjectManager: React.FC = () => {
  return (
    <Card 
      title="Project Management" 
      extra={<CreateProjectModal />}
    >
      <ProjectList />
    </Card>
  );
};
