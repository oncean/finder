import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@umijs/max';
import {
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  message,
  Rate,
  Select,
  Space,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CommentItem,
  createComment,
  deleteComment,
  fetchCommentList,
  updateComment,
} from '@/services/ant-design-pro/comment';
import { fetchShopList, type ShopItem } from '@/services/ant-design-pro/shop';

const CommentPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommentItem | null>(null);
  const [selectedRowsState, setSelectedRows] = useState<CommentItem[]>([]);
  const [shops, setShops] = useState<ShopItem[]>([]);

  const getErrorMessage = (error: any, fallback: string) =>
    error?.info?.errorMessage || error?.message || fallback;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 5,
    shopId: '',
  });

  React.useEffect(() => {
    fetchShopList({}).then((res) => {
      setShops(res.list || []);
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

  const { mutateAsync: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      messageApi.success('删除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['comment'] });
    },
    onError: (error: any) => {
      messageApi.error(getErrorMessage(error, '删除失败，请重试'));
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      rating: 5,
      shopId: '',
    });
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
      });
    } else {
      resetForm();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title) {
      messageApi.warning('请输入标题');
      return;
    }
    if (!formData.content) {
      messageApi.warning('请输入内容');
      return;
    }

    if (editingItem) {
      updateRun({
        id: editingItem.id,
        data: {
          title: formData.title,
          content: formData.content,
          rating: formData.rating,
        },
      });
    } else {
      if (!formData.shopId) {
        messageApi.warning('请选择店铺');
        return;
      }
      createRun({
        shopId: formData.shopId,
        title: formData.title,
        content: formData.content,
        rating: formData.rating,
      });
    }
  };

  const handleDelete = useCallback(
    async (item: CommentItem) => {
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
      render: (author) => {
        const user = author as CommentItem['author'];
        return (
          <Space>
            <Avatar
              size="small"
              src={user?.avatar}
              icon={!user?.avatar ? user?.nickname?.[0] : undefined}
            />
            <span>{user?.nickname || '-'}</span>
          </Space>
        );
      },
    },
    {
      title: '店铺',
      dataIndex: 'shop',
      render: (shop, record) => {
        const shopItem = shop as ShopItem | undefined;
        if (!shopItem?.id) return '-';
        return (
          <Button
            type="link"
            onClick={() =>
              navigate(`/shop?keyword=${encodeURIComponent(shopItem.name)}`)
            }
            style={{ padding: 0 }}
          >
            {shopItem.name}
          </Button>
        );
      },
      width: 150,
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
      title: '消费金额',
      dataIndex: 'consumeRecord',
      width: 100,
      render: (record) => {
        const consumeRecord = record as { amount: number } | undefined;
        return consumeRecord?.amount ? `¥${consumeRecord.amount}` : '-';
      },
    },
    {
      title: '点赞数',
      dataIndex: 'likeCount',
      width: 100,
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
          }).then((res) => ({
            data: res.list || [],
            success: true,
            total: res.total || 0,
          }))
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
        title={editingItem ? '编辑评价' : '新增评价'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        width={600}
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

          <Form.Item label="标题" required style={{ marginBottom: 16 }}>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="请输入标题"
            />
          </Form.Item>

          <Form.Item label="评分" required style={{ marginBottom: 16 }}>
            <Rate
              defaultValue={formData.rating}
              onChange={(value) =>
                setFormData({ ...formData, rating: value || 5 })
              }
            />
          </Form.Item>

          <Form.Item label="内容" required style={{ marginBottom: 24 }}>
            <Input.TextArea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="请输入评价内容"
              rows={4}
            />
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

export default CommentPage;
