import React, { useEffect } from 'react';
import { Table, Button, Popconfirm, Space, message } from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/useProjectStore';
import { Project } from '@ac-gen/shared';
import { EditProjectModal } from './EditProjectModal';

export const ProjectList: React.FC = () => {
  const { projects, loading, fetchProjects, deleteProject, createProject } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDuplicate = async (project: Project) => {
    try {
        const newProjectName = `${project.projectName}_copy_${Date.now().toString().slice(-4)}`;
        await createProject({
            projectName: newProjectName,
            displayName: `${project.displayName} (Copy)`,
            canvasWidth: project.canvasWidth,
            canvasHeight: project.canvasHeight,
            template: project.template,
            linkedProductIds: project.linkedProductIds
        });
        message.success('Project duplicated successfully');
    } catch (error) {
        message.error('Failed to duplicate project');
    }
  };

  const columns = [
    {
      title: 'Project Name (ID)',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: 'Canvas Size',
      key: 'size',
      render: (_: any, record: Project) => (
        `${record.canvasWidth} × ${record.canvasHeight}`
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Project) => (
        <Space>
          <EditProjectModal project={record} />
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            onClick={() => handleDuplicate(record)}
            title="Duplicate Project"
          />
          <Popconfirm
            title="Delete project?"
            description="This will not delete the associated assets."
            onConfirm={() => deleteProject(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return <Table dataSource={projects} columns={columns} rowKey="id" loading={loading} />;
};
