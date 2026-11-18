/* MUNI AI Hub 웹 파트
   SharePoint 페이지에 Hub를 그리고, 웹 파트 설정 창에서 목록이 있는 사이트와 목록 이름 등을 바꿀 수 있게 합니다. */
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPComponentLoader } from '@microsoft/sp-loader';
import * as strings from 'MuniAgentHubWebPartStrings';

import MuniAgentHub, { IMuniAgentHubProps } from './components/MuniAgentHub';
import { HubService } from './services/HubService';
import { initPersonaCard } from './components/persona';

export interface IMuniAgentHubWebPartProps {
  siteUrl: string;
  agentsList: string;
  ideasList: string;
  casesList: string;
  contentsList: string;
  adminEmail: string;
  launchDeskUrl: string;
  showHeader: boolean;
  logoUrl: string;
  loadBrandFonts: boolean;
}

export default class MuniAgentHubWebPart extends BaseClientSideWebPart<IMuniAgentHubWebPartProps> {
  private service: HubService | undefined;
  private serviceKey: string = '';

  protected onInit(): Promise<void> {
    if (this.properties.loadBrandFonts !== false) {
      // Pretendard (시안과 같은 글꼴, SIL OFL). 회사 정책으로 jsDelivr가 막혀 있으면 맑은 고딕 등 기본 글꼴로 표시됩니다.
      try {
        SPComponentLoader.loadCss('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
      } catch (e) { /* 글꼴 없이 계속 */ }
    }
    // 이름에 마우스를 올리면 뜨는 Microsoft 365 프로필 카드
    initPersonaCard(this.context.serviceScope);
    return super.onInit();
  }

  private getService(): HubService {
    const site = (this.properties.siteUrl || '').trim() || this.context.pageContext.web.absoluteUrl;
    const lists = {
      // 예전 기본값(Agent Catalog)이 저장된 웹 파트도 새 목록(AgentList)을 읽게 합니다
      agents: (this.properties.agentsList && this.properties.agentsList !== 'Agent Catalog') ? this.properties.agentsList : 'AgentList',
      // 예전 기본값(Idea Board)이 저장된 웹 파트도 새 목록(HubIdeas)을 읽게 합니다
      ideas: (this.properties.ideasList && this.properties.ideasList !== 'Idea Board') ? this.properties.ideasList : 'HubIdeas',
      // 예전 기본값(Case Library)이 저장된 웹 파트도 새 목록(HubCases)을 읽게 합니다
      cases: (this.properties.casesList && this.properties.casesList !== 'Case Library') ? this.properties.casesList : 'HubCases',
      contents: this.properties.contentsList || 'HubContents',
      // 프로필 배지 선택 목록. 없으면 모두 최근 배지 자동
      profiles: 'HubProfiles'
    };
    const key = [site, lists.agents, lists.ideas, lists.cases, lists.contents, lists.profiles].join('|');
    if (!this.service || key !== this.serviceKey) {
      this.service = new HubService(this.context.spHttpClient, site, lists);
      this.serviceKey = key;
    }
    return this.service;
  }

  public render(): void {
    const props: IMuniAgentHubProps = {
      service: this.getService(),
      siteUrl: (this.properties.siteUrl || '').trim() || this.context.pageContext.web.absoluteUrl,
      showHeader: this.properties.showHeader !== false,
      logoUrl: (this.properties.logoUrl || '').trim(),
      adminEmail: (this.properties.adminEmail || '').trim(),
      launchDeskUrl: (this.properties.launchDeskUrl || '').trim()
    };
    ReactDom.render(React.createElement(MuniAgentHub, props), this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  // 설정 창에서 글자를 입력할 때마다 다시 그리지 않고 '적용'을 눌렀을 때 반영합니다.
  protected get disableReactivePropertyChanges(): boolean {
    return true;
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [{
        header: { description: strings.PropertyPaneDescription },
        groups: [
          {
            groupName: strings.DataGroupName,
            groupFields: [
              PropertyPaneTextField('siteUrl', { label: strings.SiteUrlLabel, description: strings.SiteUrlDescription, placeholder: 'https://contoso.sharepoint.com/sites/AIHub' }),
              PropertyPaneTextField('agentsList', { label: strings.AgentsListLabel, placeholder: 'AgentList' }),
              PropertyPaneTextField('contentsList', { label: strings.ContentsListLabel, placeholder: 'HubContents' }),
              PropertyPaneTextField('ideasList', { label: strings.IdeasListLabel, placeholder: 'HubIdeas' }),
              PropertyPaneTextField('casesList', { label: strings.CasesListLabel, placeholder: 'HubCases' })
            ]
          },
          {
            groupName: strings.LinksGroupName,
            groupFields: [
              PropertyPaneTextField('adminEmail', { label: strings.AdminEmailLabel, description: strings.AdminEmailDescription, placeholder: 'aihub@munilabs.co.kr' }),
              PropertyPaneTextField('launchDeskUrl', { label: strings.LaunchDeskLabel, description: strings.LaunchDeskDescription, placeholder: 'https://teams.microsoft.com/l/app/…' })
            ]
          },
          {
            groupName: strings.DisplayGroupName,
            groupFields: [
              PropertyPaneToggle('showHeader', { label: strings.ShowHeaderLabel, onText: strings.On, offText: strings.Off }),
              PropertyPaneTextField('logoUrl', { label: strings.LogoUrlLabel, description: strings.LogoUrlDescription, placeholder: 'https://munilabskr.sharepoint.com/sites/AIHub/SiteAssets/muni-logo.png' }),
              PropertyPaneToggle('loadBrandFonts', { label: strings.BrandFontsLabel, onText: strings.On, offText: strings.Off })
            ]
          }
        ]
      }]
    };
  }
}
