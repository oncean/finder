import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, InputNumber, message, Rate, Select, Switch, Tag, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import React, { useCallback, useRef, useState } from 'react';
import type { ShopLocation } from '@/services/ant-design-pro/shop';
import {
  createShop,
  updateShop,
  deleteShop,
  fetchShopList,
  type ShopItem,
} from '@/services/ant-design-pro/shop';
import { uploadImage } from '@/services/ant-design-pro/upload';
import { getImageUrl } from '@/utils/format';

const ShopPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [selectedRowsState, setSelectedRows] = useState<ShopItem[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    address: '',
    city: '',
    location: { lat: 0, lng: 0 } as ShopLocation,
    coverImage: '',
    logo: '',
    phone: '',
    businessHours: '',
    rating: 5.0,
    isVerified: false,
    summaryTags: { positive: [] as string[], negative: [] as string[] },
  });

  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [logoPreview, setLogoPreview] = useState('');

  const [tagInputPositive, setTagInputPositive] = useState('');
  const [tagInputNegative, setTagInputNegative] = useState('');

  const { mutate: createRun, isPending: creating } = useMutation({
    mutationFn: createShop,
    onSuccess: () => {
      messageApi.success('创建成功');
      setDrawerOpen(false);
      resetForm();
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
    onError: () => {
      messageApi.error('创建失败，请重试');
    },
  });

  const { mutate: updateRun, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopItem> }) =>
      updateShop(id, data),
    onSuccess: () => {
      messageApi.success('更新成功');
      setDrawerOpen(false);
      resetForm();
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
    onError: () => {
      messageApi.error('更新失败，请重试');
    },
  });

  const { mutate: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => {
      messageApi.success('删除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
    onError: () => {
      messageApi.error('删除失败，请重试');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      address: '',
      city: '',
      location: { lat: 0, lng: 0 } as ShopLocation,
      coverImage: '',
      logo: '',
      phone: '',
      businessHours: '',
      rating: 5.0,
      isVerified: false,
      summaryTags: { positive: [] as string[], negative: [] as string[] },
    });
    setCoverImagePreview('');
    setLogoPreview('');
    setTagInputPositive('');
    setTagInputNegative('');
    setEditingItem(null);
  };

  const handleOpenDrawer = (item?: ShopItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category || '',
        address: item.address || '',
        city: item.city || '',
        location: item.location || { lat: 0, lng: 0 } as ShopLocation,
        coverImage: item.coverImage || '',
        logo: item.logo || '',
        phone: item.phone || '',
        businessHours: item.businessHours || '',
        rating: item.rating ?? 5.0,
        isVerified: item.isVerified ?? false,
        summaryTags: item.summaryTags || { positive: [] as string[], negative: [] as string[] },
      });
      setCoverImagePreview(item.coverImage || '');
      setLogoPreview(item.logo || '');
    } else {
      resetForm();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      messageApi.warning('请输入店铺名称');
      return;
    }

    if (editingItem) {
      updateRun({
        id: editingItem.id,
        data: formData,
      });
    } else {
      createRun(formData);
    }
  };

  const handleDelete = useCallback(
    async (item: ShopItem) => {
      await delRun(item.id);
    },
    [delRun],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowsState.length === 0) {
      messageApi.warning('请选择要删除的项');
      return;
    }
    for (const item of selectedRowsState) {
      await delRun(item.id);
    }
    setSelectedRows([]);
  }, [selectedRowsState, delRun, messageApi]);

  const columns: ProColumns<ShopItem>[] = [
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 80,
      render: (logo) =>
        logo ? (
          <img src={getImageUrl(logo)} alt="logo" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 4 }} />
        ),
    },
    {
      title: '封面',
      dataIndex: 'coverImage',
      width: 120,
      render: (coverImage) =>
        coverImage ? (
          <img src={getImageUrl(coverImage)} alt="封面" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 80, height: 50, background: '#f0f0f0', borderRadius: 4 }} />
        ),
    },
    {
      title: '店铺名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
    },
    {
      title: '城市',
      dataIndex: 'city',
      width: 80,
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      width: 200,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 100,
      render: (rating) => <Rate disabled defaultValue={rating as number} allowHalf />,
    },
    {
      title: '评论数',
      dataIndex: 'reviewCount',
      width: 100,
    },
    {
      title: '认证',
      dataIndex: 'isVerified',
      width: 80,
      render: (isVerified) => (isVerified ? <span style={{ color: '#52c41a' }}>已认证</span> : <span style={{ color: '#d9d9d9' }}>未认证</span>),
    },
    {
      title: '标签汇总',
      dataIndex: 'summaryTags',
      width: 200,
      render: (summaryTags) => {
        if (!summaryTags) return '-';
        const all = [
          ...(summaryTags.positive || []).map((t: string) => ({ text: t, color: 'green' })),
          ...(summaryTags.negative || []).map((t: string) => ({ text: t, color: 'red' })),
        ];
        return all.length > 0 ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {all.slice(0, 5).map((item, idx) => (
              <Tag key={idx} color={item.color}>{item.text}</Tag>
            ))}
            {all.length > 5 && <Tag>+{all.length - 5}</Tag>}
          </span>
        ) : '-';
      },
    },
    {
      title: '电话',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: '营业时间',
      dataIndex: 'businessHours',
      width: 150,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Button
          type="link"
          onClick={() => handleOpenDrawer(record)}
          key="edit"
        >
          编辑
        </Button>,
        <Button
          type="link"
          danger
          onClick={() => handleDelete(record)}
          key="delete"
        >
          删除
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer title="店铺管理">
      {contextHolder}
      <ProTable<ShopItem>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            onClick={() => handleOpenDrawer()}
            key="create"
          >
            新增店铺
          </Button>,
        ]}
        request={(params) =>
          fetchShopList({
            current: params.current,
            pageSize: params.pageSize,
          })
        }
        columns={columns}
        rowSelection={{
          onChange: (_, selectedRows) => {
            setSelectedRows(selectedRows);
          },
        }}
      />

      {selectedRowsState.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              已选择 <span style={{ fontWeight: 600 }}>{selectedRowsState.length}</span> 项
            </div>
          }
        >
          <Button loading={deleting} onClick={handleBatchDelete} danger>
            批量删除
          </Button>
        </FooterToolbar>
      )}

      <Drawer
        title={editingItem ? '编辑店铺' : '新增店铺'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        width={600}
      >
        <div style={{ padding: '20px' }}>
          <Form.Item label="店铺名称" required style={{ marginBottom: 16 }}>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入店铺名称"
            />
          </Form.Item>

          <Form.Item label="分类" style={{ marginBottom: 16 }}>
            <Select
              value={formData.category || undefined}
              onChange={(value) => setFormData({ ...formData, category: value })}
              placeholder="请选择店铺分类"
              allowClear
              options={[
                { label: '美食', value: '美食' },
                { label: '饮品', value: '饮品' },
                { label: '休闲娱乐', value: '休闲娱乐' },
                { label: '丽人美发', value: '丽人美发' },
                { label: '生活服务', value: '生活服务' },
                { label: '购物', value: '购物' },
                { label: '运动健身', value: '运动健身' },
                { label: '酒店住宿', value: '酒店住宿' },
                { label: '景点旅游', value: '景点旅游' },
                { label: '其他', value: '其他' },
              ]}
            />
          </Form.Item>

          <Form.Item label="城市" style={{ marginBottom: 16 }}>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="请输入所在城市"
            />
          </Form.Item>

          <Form.Item label="地址" style={{ marginBottom: 16 }}>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="请输入店铺地址"
            />
          </Form.Item>

          <Form.Item label="经纬度" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <InputNumber
                value={formData.location.lat}
                onChange={(value) =>
                  setFormData({ ...formData, location: { ...formData.location, lat: value ?? 0 } })
                }
                placeholder="纬度"
                style={{ flex: 1 }}
                step={0.0001}
                precision={6}
              />
              <InputNumber
                value={formData.location.lng}
                onChange={(value) =>
                  setFormData({ ...formData, location: { ...formData.location, lng: value ?? 0 } })
                }
                placeholder="经度"
                style={{ flex: 1 }}
                step={0.0001}
                precision={6}
              />
            </div>
          </Form.Item>

          <Form.Item label="电话" style={{ marginBottom: 16 }}>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="请输入联系电话"
            />
          </Form.Item>

          <Form.Item label="营业时间" style={{ marginBottom: 16 }}>
            <Input
              value={formData.businessHours}
              onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })}
              placeholder="如：09:00-22:00"
            />
          </Form.Item>

          <Form.Item label="评分" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Rate
                allowHalf
                value={formData.rating}
                onChange={(value) => setFormData({ ...formData, rating: value || 5.0 })}
              />
              <InputNumber
                min={0}
                max={5}
                step={0.1}
                value={formData.rating}
                onChange={(value) => setFormData({ ...formData, rating: value ?? 5.0 })}
                style={{ width: 80 }}
                precision={1}
              />
            </div>
          </Form.Item>

          <Form.Item label="认证状态" style={{ marginBottom: 16 }}>
            <Switch
              checked={formData.isVerified}
              onChange={(checked) => setFormData({ ...formData, isVerified: checked })}
              checkedChildren="已认证"
              unCheckedChildren="未认证"
            />
          </Form.Item>

          <Form.Item label="正面标签" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: formData.summaryTags.positive.length > 0 ? 8 : 0 }}>
              {formData.summaryTags.positive.map((tag, idx) => (
                <Tag
                  key={idx}
                  color="green"
                  closable
                  onClose={() => {
                    const newTags = formData.summaryTags.positive.filter((_, i) => i !== idx);
                    setFormData({ ...formData, summaryTags: { ...formData.summaryTags, positive: newTags } });
                  }}
                >
                  {tag}
                </Tag>
              ))}
            </div>
            <Input
              value={tagInputPositive}
              onChange={(e) => setTagInputPositive(e.target.value)}
              onPressEnter={() => {
                const text = tagInputPositive.trim();
                if (text && !formData.summaryTags.positive.includes(text)) {
                  setFormData({
                    ...formData,
                    summaryTags: { ...formData.summaryTags, positive: [...formData.summaryTags.positive, text] },
                  });
                }
                setTagInputPositive('');
              }}
              placeholder="输入标签后按回车添加"
            />
          </Form.Item>

          <Form.Item label="负面标签" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: formData.summaryTags.negative.length > 0 ? 8 : 0 }}>
              {formData.summaryTags.negative.map((tag, idx) => (
                <Tag
                  key={idx}
                  color="red"
                  closable
                  onClose={() => {
                    const newTags = formData.summaryTags.negative.filter((_, i) => i !== idx);
                    setFormData({ ...formData, summaryTags: { ...formData.summaryTags, negative: newTags } });
                  }}
                >
                  {tag}
                </Tag>
              ))}
            </div>
            <Input
              value={tagInputNegative}
              onChange={(e) => setTagInputNegative(e.target.value)}
              onPressEnter={() => {
                const text = tagInputNegative.trim();
                if (text && !formData.summaryTags.negative.includes(text)) {
                  setFormData({
                    ...formData,
                    summaryTags: { ...formData.summaryTags, negative: [...formData.summaryTags.negative, text] },
                  });
                }
                setTagInputNegative('');
              }}
              placeholder="输入标签后按回车添加"
            />
          </Form.Item>

          <Form.Item label="封面图片" style={{ marginBottom: 16 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file) => {
                try {
                  const res = await uploadImage(file);
                  setFormData((prev) => ({ ...prev, coverImage: res.fileId }));
                  setCoverImagePreview(res.url);
                  messageApi.success('封面上传成功');
                } catch {
                  messageApi.error('封面上传失败');
                }
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>
                {formData.coverImage ? '更换封面' : '上传封面'}
              </Button>
            </Upload>
            {coverImagePreview && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={coverImagePreview}
                  alt="封面预览"
                  style={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 4 }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item label="Logo图片" style={{ marginBottom: 24 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file) => {
                try {
                  const res = await uploadImage(file);
                  setFormData((prev) => ({ ...prev, logo: res.fileId }));
                  setLogoPreview(res.url);
                  messageApi.success('Logo上传成功');
                } catch {
                  messageApi.error('Logo上传失败');
                }
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>
                {formData.logo ? '更换Logo' : '上传Logo'}
              </Button>
            </Upload>
            {logoPreview && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={logoPreview}
                  alt="Logo预览"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                />
              </div>
            )}
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={creating || updating}
              onClick={handleSubmit}
            >
              {editingItem ? '保存修改' : '创建'}
            </Button>
          </div>
        </div>
      </Drawer>
    </PageContainer>
  );
};

export default ShopPage;
