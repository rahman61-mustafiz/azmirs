import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /* BD mobile numbers: 01XXXXXXXXX, optionally +880 prefixed */
  @Matches(/^(\+?880)?0?1[0-9]{9}$/, { message: 'ফোন নম্বরটা ঠিক মনে হচ্ছে না' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  delivery_area?: string;
}

export class CreateOrderDto {
  @IsDefined({ message: 'customer তথ্য লাগবে' })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @IsUUID()
  fabric_design_id!: string;

  @IsUUID()
  colorway_id!: string;

  @IsUUID()
  garment_type_id!: string;

  @IsUUID()
  style_photo_id!: string;

  @IsOptional()
  @IsUUID()
  lace_option_id?: string | null;

  @IsIn(['reference_garment', 'measurement_form'])
  sizing_method!: 'reference_garment' | 'measurement_form';

  /* measurement_form: all 10 fields, inches; validated field-by-field in the service */
  @IsOptional()
  @IsObject()
  measurements?: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
