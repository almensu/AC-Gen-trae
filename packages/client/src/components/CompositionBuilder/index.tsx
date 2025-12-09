import React, { useMemo, useState, useEffect } from 'react';
import { Card, Select, Form, Button, Row, Col, Typography, Table, Tag, Tabs } from 'antd';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { useCompositionStore } from '../../stores/useCompositionStore';
import { CompositionInput } from '@ac-gen/shared';
import { LayerCompositor } from '../LayerCompositor';
import { BatchGenerator } from '../BatchGenerator';
import { ProjectTemplateEditor } from '../ProjectTemplateEditor';
import { InstanceFineTuner } from '../InstanceFineTuner';

const { Title } = Typography;
const { Option } = Select;

export const CompositionBuilder: React.FC = () => {
  const { projects, fetchProjects } = useProjectStore();
  const { products, fetchProducts, fetchDecorations } = useAssetStore();
  
  const {
    selectedProjectId,
    selectedProductIds,
    selectedEnergyLevels,
    selectedCapacityCodes,
    generatedVariants,
    setProjectId,
    setSelectedProductIds,
    setSelectedEnergyLevels,
    setSelectedCapacityCodes,
    generateVariants,
  } = useCompositionStore();

  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    fetchProjects();
    fetchProducts();
  }, [fetchProjects, fetchProducts]);

  // 当选择项目改变时，获取该项目的装饰图
  useEffect(() => {
    if (selectedProjectId) {
      fetchDecorations(selectedProjectId);
    }
  }, [selectedProjectId, fetchDecorations]);

  // 获取当前选中项目的信息
  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId) || 
    projects.find(p => p.projectName === selectedProjectId), 
  [projects, selectedProjectId]);

  // Filter products based on project whitelist
  const availableProducts = useMemo(() => {
    if (!currentProject?.linkedProductIds || currentProject.linkedProductIds.length === 0) {
      return products;
    }
    return products.filter(p => currentProject.linkedProductIds!.includes(p.id));
  }, [products, currentProject]);

  const handleGenerate = () => {
    generateVariants();
    setActiveTab('preview'); // 生成后自动切换到预览 Tab
  };

  const columns = [
    {
      title: 'Project',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: 'Product',
      dataIndex: 'productId',
      key: 'productId',
      render: (id: string) => {
        const p = products.find(prod => prod.id === id);
        return p ? `${p.meta.series} - ${p.meta.color}` : id;
      }
    },
    {
      title: 'Energy Level',
      dataIndex: 'energyLevel',
      key: 'energyLevel',
      render: (text: string) => text ? <Tag color="green">{text}</Tag> : '-'
    },
    {
      title: 'Capacity',
      dataIndex: 'capacityCode',
      key: 'capacityCode',
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-'
    },
  ];

  const tabItems = [
    {
      key: 'config',
      label: 'Configuration',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Configuration">
            <Form layout="vertical">
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="Select Project" required>
                    <Select 
                      placeholder="Select a project"
                      value={selectedProjectId}
                      onChange={setProjectId}
                    >
                      {projects.map(p => (
                        <Option key={p.id} value={p.projectName}>
                          {p.displayName} ({p.projectName})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col span={8}>
                  <Form.Item label="Select Products" required>
                    <Select
                      mode="multiple"
                      placeholder="Select products"
                      value={selectedProductIds}
                      onChange={setSelectedProductIds}
                      disabled={!selectedProjectId}
                    >
                      {availableProducts.map(p => (
                        <Option key={p.id} value={p.id}>
                          {p.meta.series} - {p.meta.color} ({p.meta.acFormFactor})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={8}>
                   <Form.Item label="Variants Configuration">
                     <div style={{ marginBottom: 8 }}>
                       <Select
                         mode="multiple"
                         placeholder="Energy Levels (e.g. B1)"
                         value={selectedEnergyLevels}
                         onChange={setSelectedEnergyLevels}
                         style={{ width: '100%' }}
                       >
                         <Option value="B1">B1 (一级能效)</Option>
                         <Option value="B3">B3 (三级能效)</Option>
                       </Select>
                     </div>
                     <div>
                       <Select
                         mode="multiple"
                         placeholder="Capacity Codes (e.g. 35)"
                         value={selectedCapacityCodes}
                         onChange={setSelectedCapacityCodes}
                         style={{ width: '100%' }}
                       >
                         <Option value="26">26</Option>
                         <Option value="35">35</Option>
                         <Option value="50">50</Option>
                         <Option value="72">72</Option>
                         <Option value="100">100</Option>
                       </Select>
                     </div>
                   </Form.Item>
                </Col>
              </Row>

              <Row>
                <Col span={24} style={{ textAlign: 'right' }}>
                  <Button 
                    type="primary" 
                    onClick={handleGenerate}
                    disabled={!selectedProjectId || selectedProductIds.length === 0}
                  >
                    Generate Preview List
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>

          {generatedVariants.length > 0 && (
            <Card title={`Generated Variants List (${generatedVariants.length})`}>
              <Table 
                dataSource={generatedVariants} 
                columns={columns} 
                rowKey={(record) => `${record.productId}-${record.energyLevel}-${record.capacityCode}`}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )}
        </div>
      )
    },
    {
      key: 'template',
      label: 'Project Template',
      children: <ProjectTemplateEditor />
    },
    {
      key: 'preview',
      label: 'Canvas Preview',
      children: <LayerCompositor />
    },
    {
      key: 'fine-tune',
      label: 'Instance Fine-Tuner',
      children: <InstanceFineTuner />
    },
    {
      key: 'batch',
      label: 'Batch Generation',
      children: <BatchGenerator />
    }
  ];

  return (
    <Tabs 
      activeKey={activeTab} 
      onChange={setActiveTab} 
      items={tabItems}
    />
  );
};
