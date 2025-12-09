import React, { useEffect } from 'react';
import { Table, Button, Popconfirm, Image, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useAssetStore } from '../../stores/useAssetStore';
import { DecorationAsset } from '@ac-gen/shared';

const API_BASE = 'http://localhost:3001/storage/';

export const DecorationList: React.FC = () => {
  const { decorations, loading, fetchDecorations, deleteDecoration } = useAssetStore();

  useEffect(() => {
    fetchDecorations();
  }, [fetchDecorations]);

  const columns = [
    {
      title: 'Preview',
      dataIndex: 'filePath',
      key: 'preview',
      render: (text: string) => (
        <Image
          width={50}
          src={`${API_BASE}${text}`}
          alt="preview"
          fallback="https://via.placeholder.com/50"
        />
      ),
    },
    {
      title: 'Project',
      dataIndex: ['meta', 'projectName'],
      key: 'projectName',
    },
    {
      title: 'Category',
      dataIndex: ['meta', 'category'],
      key: 'category',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Energy Levels',
      dataIndex: ['meta', 'energyLevels'],
      key: 'energyLevels',
      render: (levels: string[]) => (
        <>
          {levels?.map((level) => (
            <Tag key={level}>{level}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Capacity Codes',
      dataIndex: ['meta', 'capacityCodes'],
      key: 'capacityCodes',
      render: (codes: string[]) => (
        <>
          {codes?.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Z-Index',
      dataIndex: ['meta', 'zIndex'],
      key: 'zIndex',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: DecorationAsset) => (
        <Popconfirm
          title="Delete decoration?"
          onConfirm={() => deleteDecoration(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return <Table dataSource={decorations} columns={columns} rowKey="id" loading={loading} />;
};
