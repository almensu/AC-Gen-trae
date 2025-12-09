import React from 'react';
import { Card, Tabs } from 'antd';
import { ProductUpload } from './ProductUpload';
import { ProductList } from './ProductList';

export const AssetLibrary: React.FC = () => {
  const items = [
    {
      key: 'products',
      label: 'Product Assets',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <ProductUpload />
          </div>
          <ProductList />
        </div>
      ),
    },
    {
      key: 'decorations',
      label: 'Decoration Assets',
      children: <div>Coming Soon (Decorations)</div>,
    },
  ];

  return (
    <Card title="Asset Management">
      <Tabs defaultActiveKey="products" items={items} />
    </Card>
  );
};
