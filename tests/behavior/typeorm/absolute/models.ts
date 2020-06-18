import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Absolute {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
}