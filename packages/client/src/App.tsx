import React from 'react';
import { Layout, Typography } from 'antd';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>AC-Gen</Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        <div style={{ background: '#fff', padding: 24, minHeight: 380 }}>
          <p>Welcome to AC-Gen Application</p>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>AC-Gen ©2025 Created by Trae</Footer>
    </Layout>
  );
};

export default App;
