import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, message, Rate, Select, Avatar, Space, Upload, Switch, InputNumber, DatePicker } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  createComment,
  updateComment,
  deleteComment,
  fetchCommentList,
  type CommentItem,
} from '@/services/ant-design-pro/comment';
import { fetchShopList, type ShopItem } from '@/services/ant-design-pro/shop';
import { fetchWechatUserList, type WechatUserItem } from '@/services/ant-design-pro/wechat-user';
import { uploadImage } from '@/services/ant-design-pro/upload';
import dayjs from 'dayjs';

const CommentPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommentItem | null>(null);
  const [selectedRowsState, setSelectedRows] = useState<CommentItem[]>([]);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [users, setUsers] = useState<WechatUserItem[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 5,
    shopId: '',
    authorId: '',
    images: [] as string[],
    consumeAmount: undefined as number | undefined,
    consumeTradeTime: undefined as dayjs.Dayjs | undefined,
    consumeImage: '',
    likeCount: 0,
    isFengxiangbiao: false,
    fengxiangbiaoRank: undefined as number | undefined,
  });

  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [consumeImagePreview, setConsumeImagePreview] = useState('');

  React.useEffect(() => {
    fetchShopList({}).then((res) => {
      if (res.success) {
        setShops(res.data || []);
      }
    });
    fetchWechatUserList({ pageSize: 100 }).then((res) => {
      setUsers(res.data || []);
    });
  }, []);

  const { mutate: createRun, isPending: creating } = useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      messageApi.success('创建成功');
      setDrawerOpen(false);
      resetForm();
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['comment'] });
    },
    onError: () => {
      messageApi.error('创建失败，请重试');
    },
  });

  const { mutate: updateRun, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommentItem> }) =>
      updateComment(id, data),
    onSuccess: () => {
      messageApi.success('更新成功');
      setDrawerOpen(false);
      resetForm();
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['comment'] });
    },
    onError: () => {
      messageApi.error('更新失败，请重试');
    },
  });

  const { mutate: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      messageApi.success('删除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['comment'] });
    },
    onError: () => {
      messageApi.error('删除失败，请重试');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      rating: 5,
      shopId: '',
      authorId: '',
      images: [],
      consumeAmount: undefined,
      consumeTradeTime: undefined,
      consumeImage: '',
      likeCount: 0,
      isFengxiangbiao: false,
      fengxiangbiaoRank: undefined,
    });
    setPreviewImages([]);
    setConsumeImagePreview('');
    setEditingItem(null);
  };

  const handleOpenDrawer = (item?: CommentItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        content: item.content,
        rating: item.rating,
        shopId: item.shopId,
        authorId: item.authorId || '',
        images: item.images || [],
        consumeAmount: item.consumeRecord?.amount,
        consumeTradeTime: item.consumeRecord?.tradeTime ? dayjs(item.consumeRecord.tradeTime) : undefined,
        consumeImage: item.consumeRecord?.image || '',
        likeCount: item.likeCount,
        isFengxiangbiao: item.isFengxiangbiao || false,
        fengxiangbiaoRank: item.fengxiangbiaoRank ?? undefined,
      });
    } else {
      resetForm();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.shopId) {
      messageApi.warning('请选择店铺');
      return;
    }
    if (!formData.authorId) {
      messageApi.warning('请选择用户');
      return;
    }
    if (!formData.title) {
      messageApi.warning('请输入标题');
      return;
    }
    if (!formData.content) {
      messageApi.warning('请输入内容');
      return;
    }

    const payload: any = {
      title: formData.title,
      content: formData.content,
      rating: formData.rating,
      authorId: formData.authorId || null,
      images: formData.images,
      consumeRecord: formData.consumeAmount ? {
        amount: formData.consumeAmount,
        tradeTime: formData.consumeTradeTime ? formData.consumeTradeTime.format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
        image: formData.consumeImage || undefined,
      } : undefined,
      likeCount: formData.likeCount,
      isFengxiangbiao: formData.isFengxiangbiao,
      fengxiangbiaoRank: formData.fengxiangbiaoRank,
    };

    if (editingItem) {
      updateRun({
        id: editingItem.id,
        data: payload,
      });
    } else {
      createRun({
        shopId: formData.shopId,
        ...payload,
      });
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      const data = await uploadImage(file);
      if (data.fileId) {
        setFormData((prev) => ({ ...prev, images: [...prev.images, data.fileId] }));
        setPreviewImages((prev) => [...prev, data.url]);
        messageApi.success('图片上传成功');
      } else {
        messageApi.error('上传失败');
      }
    } catch (error: any) {
      messageApi.error(error?.message || '上传失败');
    }
  };

  const handleUploadConsumeImage = async (file: File) => {
    try {
      const data = await uploadImage(file);
      if (data.fileId) {
        setFormData((prev) => ({ ...prev, consumeImage: data.fileId }));
        setConsumeImagePreview(data.url);
        messageApi.success('凭证上传成功');
      } else {
        messageApi.error('上传失败');
      }
    } catch (error: any) {
      messageApi.error(error?.message || '上传失败');
    }
  };

  const handleDelete = useCallback(
    async (item: CommentItem) => {
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

  const columns: ProColumns<CommentItem>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      width: 300,
    },
    {
      title: '用户',
      dataIndex: 'author',
      width: 150,
      render: (_, record) =>
        record.author ? (
          <Space>
            <Avatar
              size="small"
              src={record.author.avatar}
              icon={!record.author.avatar ? record.author.nickname?.[0] : undefined}
            />
            <span>{record.author.nickname || '-'}</span>
          </Space>
        ) : '-',
    },
    {
      title: '店铺',
      dataIndex: 'shop',
      render: (_, record) => record.shop?.name || '-',
      width: 150,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 100,
      render: (rating) => <Rate disabled defaultValue={rating as number} allowHalf />,
    },
    {
      title: '消费金额',
      dataIndex: 'consumeRecord',
      width: 100,
      render: (_, record) =>
        record.consumeRecord?.amount ? `¥${record.consumeRecord.amount}` : '-',
    },
    {
      title: '点赞数',
      dataIndex: 'likeCount',
      width: 100,
    },
    {
      title: '风向标',
      dataIndex: 'isFengxiangbiao',
      width: 100,
      render: (_, record) => record.isFengxiangbiao ? `是${record.fengxiangbiaoRank ? `(排${record.fengxiangbiaoRank})` : ''}` : '否',
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
    <PageContainer title="评价管理">
      {contextHolder}
      <ProTable<CommentItem>
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
            新增评价
          </Button>,
        ]}
        request={(params) =>
          fetchCommentList({
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
        title={editingItem ? '编辑评价' : '新增评价'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        width={700}
      >
        <div style={{ padding: '20px' }}>
          <Form.Item label="店铺" required style={{ marginBottom: 16 }}>
            <Select
              value={formData.shopId}
              onChange={(value) => setFormData({ ...formData, shopId: value })}
              placeholder="请选择店铺"
              style={{ width: '100%' }}
              disabled={!!editingItem}
            >
              {shops.map((shop) => (
                <Select.Option key={shop.id} value={shop.id}>
                  {shop.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="用户" required style={{ marginBottom: 16 }}>
            <Select
              value={formData.authorId}
              onChange={(value) => setFormData({ ...formData, authorId: value })}
              placeholder="请选择用户"
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              notFoundContent={users.length === 0 ? '暂无用户数据' : undefined}
            >
              {users.map((user) => (
                <Select.Option key={user.id} value={user.id} label={user.nickname}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size="small" src={user.avatar} icon={!user.avatar ? user.nickname?.[0] : undefined} />
                    <span>{user.nickname || '未知用户'}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="标题" required style={{ marginBottom: 16 }}>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入标题"
            />
          </Form.Item>

          <Form.Item label="评分" required style={{ marginBottom: 16 }}>
            <Rate
              value={formData.rating}
              onChange={(value) => setFormData({ ...formData, rating: value || 5 })}
            />
          </Form.Item>

          <Form.Item label="内容" required style={{ marginBottom: 16 }}>
            <Input.TextArea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="请输入评价内容"
              rows={4}
            />
          </Form.Item>

          <Form.Item label="评价图片" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {previewImages.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                  <Button
                    type="primary"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: -8, right: -8, minWidth: 24, width: 24, height: 24, padding: 0 }}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
                      setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  />
                </div>
              ))}
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUploadImage(file);
                  return false;
                }}
              >
                <div style={{ width: 80, height: 80, border: '1px dashed #d9d9d9', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <PlusOutlined />
                  <div style={{ marginTop: 4, fontSize: 12 }}>上传</div>
                </div>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item label="消费金额" style={{ marginBottom: 16 }}>
            <InputNumber
              value={formData.consumeAmount}
              onChange={(value) => setFormData({ ...formData, consumeAmount: value ?? undefined })}
              placeholder="请输入消费金额"
              min={0}
              precision={2}
              style={{ width: '100%' }}
              prefix="¥"
            />
          </Form.Item>

          <Form.Item label="消费时间" style={{ marginBottom: 16 }}>
            <DatePicker
              value={formData.consumeTradeTime}
              onChange={(value) => setFormData({ ...formData, consumeTradeTime: value ?? undefined })}
              showTime
              style={{ width: '100%' }}
              placeholder="请选择消费时间"
            />
          </Form.Item>

          <Form.Item label="消费凭证" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {consumeImagePreview && (
                <img src={consumeImagePreview} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUploadConsumeImage(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>上传凭证</Button>
              </Upload>
              {formData.consumeImage && (
                <Button danger onClick={() => {
                  setFormData({ ...formData, consumeImage: '' });
                  setConsumeImagePreview('');
                }}>
                  清除
                </Button>
              )}
            </div>
          </Form.Item>

          <Form.Item label="点赞数" style={{ marginBottom: 16 }}>
            <InputNumber
              value={formData.likeCount}
              onChange={(value) => setFormData({ ...formData, likeCount: value || 0 })}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="是否风向标" style={{ marginBottom: 16 }}>
            <Switch
              checked={formData.isFengxiangbiao}
              onChange={(checked) => setFormData({ ...formData, isFengxiangbiao: checked })}
            />
          </Form.Item>

          {formData.isFengxiangbiao && (
            <Form.Item label="风向标排名" style={{ marginBottom: 16 }}>
              <InputNumber
                value={formData.fengxiangbiaoRank}
                onChange={(value) => setFormData({ ...formData, fengxiangbiaoRank: value ?? undefined })}
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入排名"
              />
            </Form.Item>
          )}

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

export default CommentPage;
