import React, { useEffect } from 'react';
import { Table, Button, Popconfirm, Image } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useAssetStore } from '../../stores/useAssetStore';
import { ProductAsset } from '@ac-gen/shared';

const API_BASE = 'http://localhost:3001/storage/';

export const ProductList: React.FC = () => {
  const { products, loading, fetchProducts, deleteProduct } = useAssetStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
      title: 'Series',
      dataIndex: ['meta', 'series'],
      key: 'series',
    },
    {
      title: 'Color',
      dataIndex: ['meta', 'color'],
      key: 'color',
    },
    {
      title: 'Category',
      dataIndex: ['meta', 'category'],
      key: 'category',
    },
    {
      title: 'Type',
      dataIndex: ['meta', 'acFormFactor'],
      key: 'type',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: ProductAsset) => (
        <Popconfirm
          title="Delete product?"
          onConfirm={() => deleteProduct(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return <Table dataSource={products} columns={columns} rowKey="id" loading={loading} />;
};
