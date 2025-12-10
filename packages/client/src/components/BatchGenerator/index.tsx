import React, { useState } from 'react';
import { Card, Button, Progress, Statistic, Row, Col, Typography, message, Radio, Space } from 'antd';
import { CloudDownloadOutlined, FileImageOutlined, FileZipOutlined } from '@ant-design/icons';
import { useCompositionStore } from '../../stores/useCompositionStore';
import { batchApi } from '../../services/api';

const { Title, Text } = Typography;

export const BatchGenerator: React.FC = () => {
  const { generatedVariants, selectedProjectId } = useCompositionStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<'png' | 'psd'>('png');

  const handleBatchGenerate = async () => {
    if (generatedVariants.length === 0) {
      message.error('No variants to generate');
      return;
    }

    setIsGenerating(true);
    setProgress(10); // Fake progress start

    try {
      // For MVP, we send all variants at once and wait for the ZIP blob
      // In a real app with many items, we would use polling or SSE for progress
      const blob = await batchApi.generateBatch(generatedVariants, format);
      
      setProgress(100);
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedProjectId}_${format}_assets.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(`Batch generation (${format.toUpperCase()}) complete!`);
    } catch (error) {
      message.error('Batch generation failed');
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card title="Batch Generator">
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Row gutter={24} justify="center" style={{ marginBottom: 40 }}>
          <Col span={8}>
            <Statistic title="Total Variants" value={generatedVariants.length} />
          </Col>
          <Col span={8}>
            <Statistic 
                title="Estimated Size" 
                value={`${(generatedVariants.length * (format === 'psd' ? 5 : 0.5)).toFixed(1)} MB`} 
                suffix={format === 'psd' ? '(PSD)' : '(PNG)'}
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 32 }}>
            <Text type="secondary" style={{ marginRight: 16 }}>Output Format:</Text>
            <Radio.Group value={format} onChange={e => setFormat(e.target.value)} buttonStyle="solid">
                <Radio.Button value="png"><FileImageOutlined /> PNG (Flattened)</Radio.Button>
                <Radio.Button value="psd"><FileZipOutlined /> PSD (Layered)</Radio.Button>
            </Radio.Group>
            <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {format === 'psd' 
                        ? 'Generates layered PSD files. Editable layers with original resolution.' 
                        : 'Generates flattened PNG images. Best for direct usage.'}
                </Text>
            </div>
        </div>

        {isGenerating && (
          <div style={{ marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
            <Progress percent={progress} status="active" />
            <Text type="secondary">Generating {format.toUpperCase()} files...</Text>
          </div>
        )}

        <Button
          type="primary"
          size="large"
          icon={<CloudDownloadOutlined />}
          onClick={handleBatchGenerate}
          loading={isGenerating}
          disabled={generatedVariants.length === 0}
        >
          {isGenerating ? 'Generating...' : `Download ${format.toUpperCase()} ZIP`}
        </Button>
      </div>
    </Card>
  );
};
