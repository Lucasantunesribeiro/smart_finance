import boto3
import json
import requests
import time

def lambda_handler(event, context):
    """
    Lambda function para corrigir o deployment do SmartFinance
    """
    
    ec2 = boto3.client('ec2')
    
    try:
        # 1. Verificar status da instância
        print("Verificando status da instância...")
        response = ec2.describe_instances(
            Filters=[{'Name': 'ip-address', 'Values': ['34.203.238.219']}]
        )
        
        if not response['Reservations']:
            return {
                'statusCode': 404,
                'body': json.dumps('Instância não encontrada')
            }
        
        instance_id = response['Reservations'][0]['Instances'][0]['InstanceId']
        instance_state = response['Reservations'][0]['Instances'][0]['State']['Name']
        
        print(f"Instância {instance_id} está {instance_state}")
        
        # 2. Verificar se a aplicação está respondendo
        try:
            app_response = requests.get('http://34.203.238.219/', timeout=5)
            if app_response.status_code == 200:
                return {
                    'statusCode': 200,
                    'body': json.dumps('Aplicação já está funcionando!')
                }
        except:
            print("Aplicação não está respondendo, continuando com correção...")
        
        # 3. Verificar Security Groups
        security_groups = response['Reservations'][0]['Instances'][0]['SecurityGroups']
        for sg in security_groups:
            sg_rules = ec2.describe_security_groups(GroupIds=[sg['GroupId']])
            print(f"Security Group {sg['GroupId']} tem as seguintes regras:")
            for rule in sg_rules['SecurityGroups'][0]['IpPermissions']:
                print(f"  Porta {rule.get('FromPort', 'N/A')} - {rule.get('ToPort', 'N/A')}")
        
        # 4. Criar um novo Security Group se necessário
        vpc_id = response['Reservations'][0]['Instances'][0]['VpcId']
        
        try:
            new_sg = ec2.create_security_group(
                GroupName='smartfinance-fixed-sg',
                Description='Security Group corrigido para SmartFinance',
                VpcId=vpc_id
            )
            
            sg_id = new_sg['GroupId']
            
            # Adicionar regras necessárias
            rules = [
                {'port': 80, 'description': 'HTTP'},
                {'port': 443, 'description': 'HTTPS'},
                {'port': 22, 'description': 'SSH'},
                {'port': 3000, 'description': 'Frontend'},
                {'port': 5000, 'description': 'Backend'},
                {'port': 3001, 'description': 'Payment Service'}
            ]
            
            for rule in rules:
                ec2.authorize_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[{
                        'IpProtocol': 'tcp',
                        'FromPort': rule['port'],
                        'ToPort': rule['port'],
                        'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': rule['description']}]
                    }]
                )
            
            print(f"Novo Security Group criado: {sg_id}")
            
        except Exception as e:
            print(f"Erro ao criar Security Group: {str(e)}")
        
        # 5. Tentar reiniciar a instância (se tivermos permissão)
        try:
            ec2.reboot_instances(InstanceIds=[instance_id])
            print(f"Instância {instance_id} reiniciada")
            
            # Aguardar reinicialização
            time.sleep(60)
            
        except Exception as e:
            print(f"Sem permissão para reiniciar: {str(e)}")
        
        # 6. Verificar resultado final
        time.sleep(30)
        try:
            final_response = requests.get('http://34.203.238.219/', timeout=10)
            if final_response.status_code == 200:
                result = "✅ Aplicação corrigida e funcionando!"
            else:
                result = f"❌ Aplicação ainda não responde (status: {final_response.status_code})"
        except Exception as e:
            result = f"❌ Erro ao testar aplicação: {str(e)}"
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Processo de correção executado',
                'instance_id': instance_id,
                'instance_state': instance_state,
                'result': result
            })
        }
        
    except Exception as e:
        print(f"Erro geral: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Erro: {str(e)}')
        }