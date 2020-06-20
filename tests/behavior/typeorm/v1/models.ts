import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"


@Entity()
export class Animal {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    public name: string
    @OneToMany(x => Tag, x => x.animal)
    public tags: Tag[]
}


@Entity()
export class Tag {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
    @ManyToOne(x => Animal, x => x.tags)
    animal: Animal
}