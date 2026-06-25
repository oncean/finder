import { ConflictException } from '@nestjs/common';
import { DataSource, EntityMetadata } from 'typeorm';

export interface DeleteDependency {
  table: string;
  entity: string;
  column: string;
  label: string;
  count: number;
}

const TABLE_LABELS: Record<string, string> = {
  users: '用户',
  shops: '店铺',
  comments: '评价',
  messages: '消息',
  chat_groups: '聊天群组',
  chat_online_users: '聊天在线用户',
  admins: '管理员',
};

const COLUMN_LABELS: Record<string, string> = {
  author_id: '作者',
  sender_id: '发送人',
  user_id: '用户',
  shop_id: '店铺',
  group_id: '群组',
};

const getTableLabel = (metadata: EntityMetadata) =>
  TABLE_LABELS[metadata.tableName] || metadata.name || metadata.tableName;

const getColumnLabel = (databaseName: string) =>
  COLUMN_LABELS[databaseName] || databaseName;

export const findDeleteDependencies = async (
  dataSource: DataSource,
  targetMetadata: EntityMetadata,
  targetId: string,
): Promise<DeleteDependency[]> => {
  const dependencies: DeleteDependency[] = [];

  for (const metadata of dataSource.entityMetadatas) {
    for (const relation of metadata.relations) {
      if (relation.inverseEntityMetadata.tableName !== targetMetadata.tableName) {
        continue;
      }

      const joinColumn = relation.joinColumns[0];
      if (!joinColumn) {
        continue;
      }

      const column = joinColumn.databaseName;
      const count = await dataSource
        .getRepository(metadata.target)
        .createQueryBuilder(metadata.tableName)
        .where(`${metadata.tableName}.${joinColumn.propertyPath} = :targetId`, { targetId })
        .getCount();

      if (count > 0) {
        dependencies.push({
          table: metadata.tableName,
          entity: metadata.name,
          column,
          label: `${getTableLabel(metadata)}：${getColumnLabel(column)}`,
          count,
        });
      }
    }
  }

  return dependencies;
};

export const assertCanDeleteEntity = async (
  dataSource: DataSource,
  targetMetadata: EntityMetadata,
  targetId: string,
  targetLabel: string,
) => {
  const dependencies = await findDeleteDependencies(dataSource, targetMetadata, targetId);

  if (dependencies.length === 0) {
    return;
  }

  const detailText = dependencies
    .map((item) => `${item.label}${item.count}条`)
    .join('、');

  throw new ConflictException({
    message: `${targetLabel}删除失败：存在关联数据，请先处理 ${detailText}`,
    data: {
      reason: 'FOREIGN_KEY_DEPENDENCY',
      dependencies,
    },
  });
};
