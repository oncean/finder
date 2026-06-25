import { UploadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Form,
  Input,
  message,
  Rate,
  Select,
  Upload,
} from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import {
  createShop,
  deleteShop,
  fetchShopList,
  type ShopItem,
  updateShop,
} from '@/services/ant-design-pro/shop';
import { uploadImage } from '@/services/ant-design-pro/upload';

const ShopPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [selectedRowsState, setSelectedRows] = useState<ShopItem[]>([]);

  const getErrorMessage = (error: any, fallback: string) =>
    error?.info?.errorMessage || error?.message || fallback;

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    coverImage: '',
    logo: '',
    phone: '',
    businessHours: '',
    summaryPositive: [] as string[],
    summaryNegative: [] as string[],
  });

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

  const { mutateAsync: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => {
      messageApi.success('删除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
    onError: (error: any) => {
      messageApi.error(getErrorMessage(error, '删除失败，请重试'));
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      coverImage: '',
      logo: '',
      phone: '',
      businessHours: '',
      summaryPositive: [],
      summaryNegative: [],
    });
    setEditingItem(null);
  };

  const handleOpenDrawer = (item?: ShopItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        address: item.address,
        city: item.city || '',
        coverImage: item.coverImage,
        logo: item.logo,
        phone: item.phone,
        businessHours: item.businessHours,
        summaryPositive: item.summaryTags?.positive || [],
        summaryNegative: item.summaryTags?.negative || [],
      });
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

    const submitData = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      coverImage: formData.coverImage,
      logo: formData.logo,
      phone: formData.phone,
      businessHours: formData.businessHours,
      summaryTags: {
        positive: formData.summaryPositive,
        negative: formData.summaryNegative,
      },
    };

    if (editingItem) {
      updateRun({
        id: editingItem.id,
        data: submitData,
      });
    } else {
      createRun(submitData);
    }
  };

  const handleDelete = useCallback(
    async (item: ShopItem) => {
      try {
        await delRun(item.id);
      } catch {
        // 错误信息已在 onError 中展示
      }
    },
    [delRun],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowsState.length === 0) {
      messageApi.warning('请选择要删除的项');
      return;
    }
    for (const item of selectedRowsState) {
      try {
        await delRun(item.id);
      } catch {
        // 继续处理下一条，错误信息已在 onError 中展示
      }
    }
    setSelectedRows([]);
  }, [selectedRowsState, delRun, messageApi]);

  const columns: ProColumns<ShopItem>[] = [
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 80,
      render: (_, record) =>
        record.logo ? (
          <img
            src={record.logo}
            alt="logo"
            style={{
              width: 40,
              height: 40,
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              background: '#f0f0f0',
              borderRadius: 4,
            }}
          />
        ),
    },
    {
      title: '封面',
      dataIndex: 'coverImage',
      width: 120,
      render: (_, record) =>
        record.coverImage ? (
          <img
            src={record.coverImage}
            alt="封面"
            style={{
              width: 80,
              height: 50,
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 50,
              background: '#f0f0f0',
              borderRadius: 4,
            }}
          />
        ),
    },
    {
      title: '店铺名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      width: 200,
    },
    {
      title: '城市',
      dataIndex: 'city',
      width: 100,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 100,
      render: (rating) => (
        <Rate disabled defaultValue={rating as number} allowHalf />
      ),
    },
    {
      title: '评论数',
      dataIndex: 'commentCount',
      width: 100,
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
        <Button type="link" onClick={() => handleOpenDrawer(record)} key="edit">
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
              已选择{' '}
              <span style={{ fontWeight: 600 }}>
                {selectedRowsState.length}
              </span>{' '}
              项
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
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入店铺名称"
            />
          </Form.Item>

          <Form.Item label="地址" style={{ marginBottom: 16 }}>
            <Input
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="请输入店铺地址"
            />
          </Form.Item>

          <Form.Item label="城市" style={{ marginBottom: 16 }}>
            <Input
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              placeholder="如：南京市"
            />
          </Form.Item>

          <Form.Item label="电话" style={{ marginBottom: 16 }}>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="请输入联系电话"
            />
          </Form.Item>

          <Form.Item label="营业时间" style={{ marginBottom: 16 }}>
            <Input
              value={formData.businessHours}
              onChange={(e) =>
                setFormData({ ...formData, businessHours: e.target.value })
              }
              placeholder="如：09:00-22:00"
            />
          </Form.Item>

          <Form.Item label="AI正向总结" style={{ marginBottom: 16 }}>
            <Select
              mode="tags"
              value={formData.summaryPositive}
              onChange={(value) =>
                setFormData({ ...formData, summaryPositive: value })
              }
              placeholder="输入后回车添加，如：服务热情、口味稳定"
              tokenSeparators={[',', '，']}
            />
          </Form.Item>

          <Form.Item label="AI负向总结" style={{ marginBottom: 16 }}>
            <Select
              mode="tags"
              value={formData.summaryNegative}
              onChange={(value) =>
                setFormData({ ...formData, summaryNegative: value })
              }
              placeholder="输入后回车添加，如：排队久、停车不便"
              tokenSeparators={[',', '，']}
            />
          </Form.Item>

          <Form.Item label="封面图片" style={{ marginBottom: 16 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file) => {
                try {
                  const res = await uploadImage(file);
                  setFormData((prev) => ({ ...prev, coverImage: res.url }));
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
            {formData.coverImage && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={formData.coverImage}
                  alt="封面预览"
                  style={{
                    width: 200,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 4,
                  }}
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
                  setFormData((prev) => ({ ...prev, logo: res.url }));
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
            {formData.logo && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={formData.logo}
                  alt="Logo预览"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 4,
                  }}
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
