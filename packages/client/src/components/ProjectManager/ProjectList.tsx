import React, { useEffect } from 'react';
import { Table, Button, Popconfirm, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/useProjectStore';
import { Project } from '@ac-gen/shared';

export const ProjectList: React.FC = () => {
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
          <Button type="text" icon={<EditOutlined />} />
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
