import React, { useState } from 'react';
import { Layout, Typography, Menu } from 'antd';
import { AppstoreOutlined, PictureOutlined, BuildOutlined } from '@ant-design/icons';
import { AssetLibrary } from './components/AssetLibrary';
import { ProjectManager } from './components/ProjectManager';
import { CompositionBuilder } from './components/CompositionBuilder';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState('assets');

  const items = [
    {
      key: 'assets',
      icon: <PictureOutlined />,
      label: 'Asset Library',
    },
    {
      key: 'projects',
      icon: <AppstoreOutlined />,
      label: 'Project Manager',
    },
    {
      key: 'composition',
      icon: <BuildOutlined />,
      label: 'Composition Builder',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>AC-Gen</Title>
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          defaultSelectedKeys={['assets']} 
          items={items} 
          onSelect={({ key }) => setSelectedKey(key)}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: '16px' }}>
          {selectedKey === 'assets' && <AssetLibrary />}
          {selectedKey === 'projects' && <ProjectManager />}
          {selectedKey === 'composition' && <CompositionBuilder />}
        </Content>
        <Footer style={{ textAlign: 'center' }}>AC-Gen ©2025 Created by Trae</Footer>
      </Layout>
    </Layout>
  );
};

export default App;
