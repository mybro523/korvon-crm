import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text', default: '' })
  value: string;
}
